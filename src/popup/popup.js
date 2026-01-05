document.addEventListener('DOMContentLoaded', function() {
    const tableStatus = document.getElementById('tableStatus');
    const downloadBtn = document.getElementById('downloadBtn');
    const showBtn = document.getElementById('showBtn');
    let foundTable = null;

    async function getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    async function refreshTables() {
        try {
            const tab = await getCurrentTab();
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'scanTables' });
            
            if (response && response.tables) {
                updateTableStatus(response.tables);
            }
        } catch (error) {
            console.error('Error refreshing tables:', error);
            try {
                const tab = await getCurrentTab();
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/content/content.js']
                });
                setTimeout(refreshTables, 500);
            } catch (injectError) {
                console.error('Error injecting content script:', injectError);
            }
        }
    }

    async function updateTableStatus(tables) {
        if (tables && tables.length > 0) {
            foundTable = tables[0];
            tableStatus.textContent = 'Đã tìm thấy thời khóa biểu!';
            tableStatus.style.color = '#4CAF50';
            downloadBtn.disabled = false;
            showBtn.disabled = false;
            
            // Auto-highlight the found table
            try {
                const tab = await getCurrentTab();
                await chrome.tabs.sendMessage(tab.id, { 
                    action: 'highlightTable', 
                    index: 0
                });
            } catch (error) {
                console.error('Error auto-highlighting table:', error);
            }
        } else {
            foundTable = null;
            tableStatus.textContent = 'Không tìm thấy thời khóa biểu!';
            tableStatus.style.color = '#f44336';
            downloadBtn.disabled = true;
            showBtn.disabled = true;
        }
    }



    async function handleDownloadImage() {
        if (!foundTable) {
            alert('Không tìm thấy table phù hợp!');
            return;
        }

        try {
            const tab = await getCurrentTab();
            
            const tableResponse = await chrome.tabs.sendMessage(tab.id, { 
                action: 'convertToJSON', 
                index: 0
            });
            
            if (!tableResponse || !tableResponse.success) {
                alert('❌ Không thể lấy data từ table!');
                return;
            }
            
            downloadBtn.textContent = 'Đang tạo...';
            downloadBtn.disabled = true;
            showBtn.disabled = true;
            
            const bgPath = "./assets/tbk.png";

            generateScheduleImage(tableResponse.json, bgPath).then(base64Str => {
                console.log("Đã tạo xong ảnh!");
                const link = document.createElement('a');
                link.download = 'ThoiKhoaBieu.png';
                link.href = base64Str;
                link.click();
                
                downloadBtn.textContent = 'Download Image';
                downloadBtn.disabled = false;
                showBtn.disabled = false;
            });

            await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
                
        } catch (error) {
            downloadBtn.textContent = 'Download Image';
            downloadBtn.disabled = false;
            showBtn.disabled = false;
            
            console.error('Error generating image:', error);
            alert('❌ Lỗi khi tạo ảnh:\n' + error.message);
        }
    }

    async function handleShowImage() {
        if (!foundTable) {
            alert('Không tìm thấy table phù hợp!');
            return;
        }

        try {
            const tab = await getCurrentTab();
            
            const tableResponse = await chrome.tabs.sendMessage(tab.id, { 
                action: 'convertToJSON', 
                index: 0
            });
            
            if (!tableResponse || !tableResponse.success) {
                alert('❌ Không thể lấy data từ table!');
                return;
            }
            
            showBtn.textContent = 'Đang tạo...';
            showBtn.disabled = true;
            downloadBtn.disabled = true;
            
            const bgPath = "./assets/tbk.png";

            generateScheduleImage(tableResponse.json, bgPath).then(base64Str => {
                console.log("Đã tạo xong ảnh!");
                
                // Convert base64 to blob
                const byteString = atob(base64Str.split(',')[1]);
                const mimeString = base64Str.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });
                const blobUrl = URL.createObjectURL(blob);
                
                // Open in new tab
                chrome.tabs.create({ url: blobUrl });
                
                showBtn.textContent = 'Show Image';
                showBtn.disabled = false;
                downloadBtn.disabled = false;
            });

            await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
                
        } catch (error) {
            showBtn.textContent = 'Show Image';
            showBtn.disabled = false;
            downloadBtn.disabled = false;
            
            console.error('Error generating image:', error);
            alert('❌ Lỗi khi tạo ảnh:\n' + error.message);
        }
    }

    downloadBtn.addEventListener('click', handleDownloadImage);
    showBtn.addEventListener('click', handleShowImage);

    window.addEventListener('beforeunload', async () => {
        try {
            const tab = await getCurrentTab();
            await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
        } catch (error) {
            console.error('Error clearing highlights on popup close:', error);
        }
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
            try {
                const tab = await getCurrentTab();
                await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
            } catch (error) {
                console.error('Error clearing highlights on visibility change:', error);
            }
        }
    });

    refreshTables();
});
