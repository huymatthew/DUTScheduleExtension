document.addEventListener('DOMContentLoaded', function() {
    const tableSelect = document.getElementById('tableSelect');
    const clearBtn = document.getElementById('clearBtn');
    const postApiBtn = document.getElementById('postApiBtn');

    async function getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    async function refreshTables() {
        try {
            const tab = await getCurrentTab();
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'scanTables' });
            
            if (response && response.tables) {
                populateTableSelect(response.tables);
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

    function populateTableSelect(tables) {
        tableSelect.innerHTML = '<option value="">Chọn một table...</option>';
        
        tables.forEach((table, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Table ${index + 1} (${table.rows}x${table.cols}) - ${table.preview}`;
            tableSelect.appendChild(option);
        });
    }

    async function onTableSelectChange() {
        const selectedIndex = tableSelect.value;
        
        try {
            const tab = await getCurrentTab();
            await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
            
            if (selectedIndex !== '') {
                await chrome.tabs.sendMessage(tab.id, { 
                    action: 'highlightTable', 
                    index: parseInt(selectedIndex) 
                });
            }
        } catch (error) {
            console.error('Error auto-highlighting table:', error);
        }
    }

    async function clearAllHighlights() {
        try {
            const tab = await getCurrentTab();
            await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
        } catch (error) {
            console.error('Error clearing highlights:', error);
        }
    }

    async function handlePostToAPI() {
        const selectedIndex = tableSelect.value;
        if (selectedIndex === '') {
            alert('Vui lòng chọn một table trước!');
            return;
        }

        const apiUrl = 'http://huyskyzz.pythonanywhere.com/api/tkb_download/';

        try {
            const tab = await getCurrentTab();
            
            const tableResponse = await chrome.tabs.sendMessage(tab.id, { 
                action: 'convertToJSON', 
                index: parseInt(selectedIndex) 
            });
            
            if (!tableResponse || !tableResponse.success) {
                alert('❌ Không thể lấy data từ table!');
                return;
            }
            
            postApiBtn.textContent = 'Đang tạo...';
            postApiBtn.disabled = true;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'image/*, application/json'
                },
                body: JSON.stringify({
                    data: tableResponse.json
                })
            });

            await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });

            postApiBtn.textContent = 'Tạo thời khóa biểu';
            postApiBtn.disabled = false;

            if (response.ok) {
                const contentType = response.headers.get('content-type') || '';
                
                if (contentType.includes('image/')) {
                    const imageBlob = await response.blob();
                    const imageUrl = URL.createObjectURL(imageBlob);
                    
                    const contentDisposition = response.headers.get('content-disposition') || '';
                    let fileName = 'tbk.png';
                    
                    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                    if (filenameMatch) {
                        fileName = filenameMatch[1];
                    }
                    
                    chrome.tabs.create({ url: imageUrl });
                    setTimeout(() => URL.revokeObjectURL(imageUrl), 10000);
                    
                    alert(`✅ POST thành công!\n\nStatus: ${response.status}\nImage size: ${(imageBlob.size / 1024).toFixed(2)} KB\nContent Type: ${contentType}\nFilename: ${fileName}\n\nẢnh đã được mở trong tab mới!`);
                    console.log('Image opened in new tab:', fileName, 'Size:', imageBlob.size, 'bytes');
                    
                } else {
                    try {
                        const errorData = await response.json();
                        throw new Error(`Server error: ${errorData.message || 'Unknown error'}`);
                    } catch (parseError) {
                        const textResponse = await response.text();
                        throw new Error(`Server error: ${textResponse || 'Unknown error'}`);
                    }
                }
            } else {
                try {
                    const errorData = await response.json();
                    throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
                } catch (parseError) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
                
        } catch (error) {
            postApiBtn.textContent = 'Tạo thời khóa biểu';
            postApiBtn.disabled = false;
            
            console.error('Error posting to API:', error);
            alert('❌ Lỗi khi POST API:\n' + error.message + '\n\nKiểm tra:\n- URL có đúng không?\n- API có hỗ trợ CORS không?\n- Network connection');
        }
    }

    tableSelect.addEventListener('change', onTableSelectChange);
    clearBtn.addEventListener('click', clearAllHighlights);
    postApiBtn.addEventListener('click', handlePostToAPI);

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
