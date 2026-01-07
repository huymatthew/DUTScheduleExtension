MINTABLE_WIDTH = 7;

(function() {
    let tables = [];
    let highlightedTables = new Set();

    function scanTables() {
        const allTables = document.querySelectorAll('table');
        tables = [];

        // Find only the first table with cols >= 7
        for (let index = 0; index < allTables.length; index++) {
            const table = allTables[index];
            const rows = table.rows.length;
            let maxCols = 0;
            
            for (let i = 0; i < table.rows.length; i++) {
                maxCols = Math.max(maxCols, table.rows[i].cells.length);
            }

            if (maxCols < 7) continue;

            let preview = '';
            if (table.caption) {
                preview = table.caption.textContent.trim();
            } else if (table.querySelector('th')) {
                preview = table.querySelector('th').textContent.trim();
            } else if (table.querySelector('td')) {
                preview = table.querySelector('td').textContent.trim();
            }
            
            if (preview.length > 30) {
                preview = preview.substring(0, 30) + '...';
            }
            
            if (!preview) {
                preview = `Table 1`;
            }

            tables.push({
                element: table,
                rows: rows,
                cols: maxCols,
                preview: preview,
                index: 0
            });

            table.setAttribute('data-table-highlighter-index', 0);
            
            // Only get the first matching table
            break;
        }

        return tables.map(t => ({
            rows: t.rows,
            cols: t.cols,
            preview: t.preview,
            index: t.index
        }));
    }

    function highlightTable(index) {
        const table = tables[index];
        if (!table) return;

        table.element.classList.remove('table-highlighter-highlighted');
        table.element.classList.add('table-highlighter-highlighted');
        
        table.element.style.border = '3px solid rgb(0, 255, 0)';
        table.element.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
        
        highlightedTables.add(index);

        table.element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    function clearHighlights() {
        tables.forEach((table, index) => {
            table.element.classList.remove('table-highlighter-highlighted');
            table.element.style.border = '';
            table.element.style.boxShadow = '';
        });
        highlightedTables.clear();
    }

    function convertTableToJSON(index) {
        const table = tables[index];
        if (!table) return null;

        const tableElement = table.element;
        const result = [];
        const headers = [];
        
        try {
            let headerRow = null;
            const thead = tableElement.querySelector('thead');
            if (thead) {
                headerRow = thead.querySelector('tr');
            } else {
                headerRow = tableElement.querySelector('tr');
            }

            if (headerRow) {
                const headerCells = headerRow.querySelectorAll('th, td');
                headerCells.forEach((cell, index) => {
                    let headerText = cell.textContent.trim();
                    if (!headerText) {
                        headerText = `Column_${index + 1}`;
                    }
                    headers.push(headerText);
                });
            }

            const rows = Array.from(tableElement.querySelectorAll('tr'));
            let startIndex = 0;
            
            if (!thead && headerRow && headerRow.querySelector('th')) {
                startIndex = 1;
            }

            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('td, th');
                
                if (cells.length > 0) {
                    const rowData = {};
                    
                    cells.forEach((cell, cellIndex) => {
                        const headerKey = headers[cellIndex] || `Column_${cellIndex + 1}`;
                        let cellValue = cell.textContent.trim();
                        
                        if (cellValue && !isNaN(cellValue) && cellValue !== '') {
                            const numValue = parseFloat(cellValue);
                            if (!isNaN(numValue)) {
                                cellValue = numValue;
                            }
                        }
                        
                        rowData[headerKey] = cellValue;
                    });
                    
                    result.push(rowData);
                }
            }

            return {
                success: true,
                json: JSON.stringify(result, null, 2),
                rows: result.length,
                cols: headers.length,
                headers: headers
            };

        } catch (error) {
            console.error('Error converting table to JSON:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'scanTables':
                const tableData = scanTables();
                sendResponse({ tables: tableData });
                break;
                
            case 'highlightTable':
                highlightTable(request.index);
                sendResponse({ success: true });
                break;
                
            case 'clearHighlights':
                clearHighlights();
                sendResponse({ success: true });
                break;
                
            case 'convertToJSON':
                const jsonResult = convertTableToJSON(request.index);
                sendResponse(jsonResult);
                break;
        }
        return true;
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scanTables);
    } else {
        scanTables();
    }

    const observer = new MutationObserver(function(mutations) {
        let shouldRescan = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && (node.tagName === 'TABLE' || node.querySelector('table'))) {
                        shouldRescan = true;
                    }
                });
            }
        });
        
        if (shouldRescan) {
            setTimeout(scanTables, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
