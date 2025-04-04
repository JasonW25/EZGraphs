// Global variables
let csvData = null;
let headers = [];
let chartInstance = null;
const MAX_DISPLAY_POINTS = 50; // Default max points to display at once without scrolling
let currentDataStart = 0; // Starting index for data display window
let fullDataset = { labels: [], data: [], colorData: [], xValues: [] }; // Store complete dataset for scrolling
let isFullscreen = false; // Track fullscreen state
let normalizeColors = false; // Track if colors should be normalized
let colorMinValue = null; // Min value for color normalization
let colorMaxValue = null; // Max value for color normalization

// DOM elements
const csvFileInput = document.getElementById('csv-file');
const dataTableContainer = document.getElementById('data-table-container');
const xAxisSelect = document.getElementById('x-axis');
const yAxisSelect = document.getElementById('y-axis');
const colorAxisSelect = document.getElementById('color-axis');
const colorGroup = document.getElementById('color-group');
const colorNormalizeGroup = document.getElementById('color-normalize-group');
const colorNormalizeCheckbox = document.getElementById('color-normalize');
const normalizeRange = document.getElementById('normalize-range');
const minValueInput = document.getElementById('min-value');
const maxValueInput = document.getElementById('max-value');
const graphTypeSelect = document.getElementById('graph-type');
const generateGraphBtn = document.getElementById('generate-graph');
const graphCanvas = document.getElementById('graph');
const scrollLeftBtn = document.getElementById('scroll-left');
const scrollRightBtn = document.getElementById('scroll-right');
const dataPositionSpan = document.getElementById('data-position');
const dataControls = document.querySelector('.data-controls');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const graphContainer = document.querySelector('.graph-container');

// Event listeners
csvFileInput.addEventListener('change', handleFileUpload);
generateGraphBtn.addEventListener('click', generateGraph);
graphTypeSelect.addEventListener('change', updateAxisOptions);
colorAxisSelect.addEventListener('change', updateColorOptions);
colorNormalizeCheckbox.addEventListener('change', toggleNormalizeRange);
scrollLeftBtn.addEventListener('click', scrollLeft);
scrollRightBtn.addEventListener('click', scrollRight);
fullscreenToggle.addEventListener('click', toggleFullscreen);

// Add keyboard listener for fullscreen escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
    }
});

// Resize event to update chart when window size changes
window.addEventListener('resize', () => {
    if (chartInstance) {
        chartInstance.resize();
    }
});

// Add scroll event listener to canvas container
graphContainer.addEventListener('wheel', handleGraphScroll);

// Function to toggle fullscreen mode
function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    
    if (isFullscreen) {
        graphContainer.classList.add('fullscreen');
        fullscreenToggle.textContent = 'Exit Fullscreen';
        document.body.style.overflow = 'hidden'; // Prevent body scrolling
    } else {
        graphContainer.classList.remove('fullscreen');
        fullscreenToggle.textContent = 'Fullscreen';
        document.body.style.overflow = ''; // Restore body scrolling
    }
    
    // Resize chart to fit new container size
    if (chartInstance) {
        setTimeout(() => {
            chartInstance.resize();
            chartInstance.update();
        }, 100); // Small delay to allow CSS transitions
    }
}

// Function to handle scrolling left (previous data)
function scrollLeft() {
    if (!fullDataset.labels.length || !chartInstance) return;
    
    // Move by 25% of the visible window
    const moveAmount = Math.max(5, Math.floor(MAX_DISPLAY_POINTS * 0.25));
    currentDataStart = Math.max(0, currentDataStart - moveAmount);
    updateChartDataWindow();
}

// Function to handle scrolling right (next data)
function scrollRight() {
    if (!fullDataset.labels.length || !chartInstance) return;
    
    // Move by 25% of the visible window
    const moveAmount = Math.max(5, Math.floor(MAX_DISPLAY_POINTS * 0.25));
    const maxStart = Math.max(0, fullDataset.labels.length - MAX_DISPLAY_POINTS);
    currentDataStart = Math.min(maxStart, currentDataStart + moveAmount);
    updateChartDataWindow();
}

// Function to handle scrolling on the graph
function handleGraphScroll(event) {
    if (!fullDataset.labels.length || !chartInstance) return;
    
    event.preventDefault();
    
    // Determine scroll direction
    const scrollDirection = Math.sign(event.deltaY);
    const dataLength = fullDataset.labels.length;
    
    // Adjust scroll speed based on data size
    const scrollSpeed = Math.max(1, Math.floor(dataLength / 500));
    
    if (scrollDirection > 0) {
        // Scroll right/forward
        if (currentDataStart + MAX_DISPLAY_POINTS < dataLength) {
            currentDataStart += scrollSpeed; // Adjusted speed
        }
    } else {
        // Scroll left/backward
        currentDataStart = Math.max(0, currentDataStart - scrollSpeed);
    }
    
    // Update the visible data window
    updateChartDataWindow();
}

// Function to update the visible data window
function updateChartDataWindow() {
    if (!chartInstance) return;
    
    const end = Math.min(currentDataStart + MAX_DISPLAY_POINTS, fullDataset.labels.length);
    
    // Get the visible data window
    const visibleLabels = fullDataset.labels.slice(currentDataStart, end);
    const visibleData = fullDataset.data.slice(currentDataStart, end);
    const visibleColorData = fullDataset.colorData ? 
        fullDataset.colorData.slice(currentDataStart, end) : [];
    const visibleXValues = fullDataset.xValues ?
        fullDataset.xValues.slice(currentDataStart, end) : [];
    
    // Update chart data based on chart type
    chartInstance.data.labels = visibleLabels;
    
    // Update datasets based on chart type
    if (chartInstance.config.type === 'scatter') {
        // Force chart update to use custom colors when using scatter
        chartInstance.update('none'); // Reset chart but don't animate
        
        // For scatter/dot plot with color grouping
        if (visibleColorData.length > 0 && colorAxisSelect.value) {
            // Create grouped datasets if we're using color grouping
            updateScatterWithColorGroups(chartInstance, visibleData, visibleColorData, visibleXValues, visibleLabels);
        } else {
            // Standard scatter plot
            updateStandardScatter(chartInstance, visibleData, visibleXValues);
        }
        
        // Update y-axis scales for scatter
        updateScatterYAxisScale(chartInstance, visibleData);
    } else if (chartInstance.config.type !== 'pie') {
        // Standard data format for most charts
        chartInstance.data.datasets.forEach((dataset) => {
            dataset.data = visibleData;
        });
        
        // Update y-axis scales for line/bar
        updateStandardYAxisScale(chartInstance, visibleData);
    }
    
    // Update position indicator
    updatePositionIndicator(currentDataStart, end, fullDataset.labels.length);
    
    // Update chart
    chartInstance.update();
}

// Function to update standard scatter plot (no color grouping)
function updateStandardScatter(chartInstance, visibleData, visibleXValues) {
    // Combine x and y values into data points
    const scatterData = visibleData.map((y, i) => {
        return {
            x: visibleXValues && visibleXValues.length > i ? visibleXValues[i] : i,
            y: y
        };
    });
    
    chartInstance.data.datasets.forEach((dataset) => {
        dataset.data = scatterData;
    });
}

// Function to update scatter plot with color groups
function updateScatterWithColorGroups(chartInstance, visibleData, visibleColorData, visibleXValues, visibleLabels) {
    // Check if we're using normalized colors
    if (normalizeColors) {
        updateScatterWithNormalizedColors(chartInstance, visibleData, visibleColorData, visibleXValues, visibleLabels);
        return;
    }
    
    // Get unique color values
    const uniqueColorValues = [...new Set(visibleColorData.filter(v => v !== null && v !== undefined))];
    
    // If we have grouped data
    if (uniqueColorValues.length > 0) {
        // Clear existing datasets
        chartInstance.data.datasets = [];
        
        // Create a dataset for each unique color value
        uniqueColorValues.forEach((colorValue, groupIndex) => {
            const groupData = [];
            const baseColor = generateGroupColor(groupIndex, uniqueColorValues.length);
            
            // Create data points for this color group
            visibleData.forEach((y, i) => {
                if (visibleColorData[i] === colorValue) {
                    // Use actual x values if available, otherwise use index
                    const xVal = visibleXValues && visibleXValues.length > i ? visibleXValues[i] : i;
                    const point = {
                        x: xVal,
                        y: y,
                        originalLabel: visibleLabels[i]
                    };
                    groupData.push(point);
                }
            });
            
            // Add dataset for this group
            chartInstance.data.datasets.push({
                label: `${colorValue}`,
                data: groupData,
                backgroundColor: baseColor,
                borderColor: baseColor,
                pointRadius: graphTypeSelect.value === 'bubble' ? 5 : 3,
                pointHoverRadius: graphTypeSelect.value === 'bubble' ? 7 : 5,
                pointStyle: graphTypeSelect.value === 'bubble' ? 'circle' : 'cross',
                showLine: false
            });
        });
        
        // Make sure legend is visible for color groups
        chartInstance.options.plugins.legend.display = true;
    }
}

// Function to update scatter with normalized colors
function updateScatterWithNormalizedColors(chart, yValues, colorValues, xValues, labels) {
    console.log("Updating scatter with normalized colors:", colorValues?.length, "color values for", yValues.length, "points");
    console.log("Normalization range:", colorMinValue, "to", colorMaxValue);
    
    if (!colorValues || colorValues.length === 0) {
        console.error("No color values provided for normalization");
        return;
    }
    
    // Create scatterData from the raw values
    const scatterData = [];
    const pointColors = [];
    
    // Find min/max for colors if not explicitly set
    let minVal = colorMinValue !== null ? colorMinValue : Math.min(...colorValues.filter(v => !isNaN(v)));
    let maxVal = colorMaxValue !== null ? colorMaxValue : Math.max(...colorValues.filter(v => !isNaN(v)));
    
    console.log("Using color range:", minVal, "to", maxVal);
    
    // Ensure min/max are different to avoid division by zero
    if (minVal === maxVal) {
        minVal = minVal - 1;
        maxVal = maxVal + 1;
    }
    
    // Create a new dataset with individual point colors
    for (let i = 0; i < yValues.length; i++) {
        const yVal = yValues[i];
        const colorVal = colorValues[i] !== undefined ? colorValues[i] : 0;
        const xVal = xValues && xValues.length > i ? xValues[i] : i;
        const label = labels && labels.length > i ? labels[i] : '';
        
        // Normalize the color value between min and max
        let normalizedVal = (colorVal - minVal) / (maxVal - minVal);
        
        // Clamp normalized value between 0 and 1
        normalizedVal = Math.max(0, Math.min(1, normalizedVal));
        
        let pointColor;
        
        // Determine if the value is negative, zero-ish, or positive in the original scale
        if (colorVal < 0) {
            // Blue for negative (darker blue for more negative)
            const intensity = 1 - (normalizedVal * 0.5); // Keep blue reasonably visible
            pointColor = `rgba(0, 0, 255, ${intensity})`;
        } else if (colorVal > 0) {
            // Red for positive (darker red for more positive)
            const intensity = 0.5 + (normalizedVal * 0.5); // Scale from 0.5 to 1 for visibility
            pointColor = `rgba(255, 0, 0, ${intensity})`;
        } else {
            // Neutral color for zero
            pointColor = 'rgba(150, 150, 150, 0.7)';
        }
        
        // Add to our data arrays
        scatterData.push({
            x: xVal,
            y: yVal,
            originalLabel: label
        });
        
        pointColors.push(pointColor);
    }
    
    // Update the chart's dataset
    if (chart.data.datasets.length > 0) {
        // Update the existing dataset
        chart.data.datasets[0].data = scatterData;
        
        // Set point colors individually - important for Chart.js to render correctly
        chart.data.datasets[0].backgroundColor = pointColors;
        chart.data.datasets[0].borderColor = pointColors;
    }
    
    // Update or create the color legend
    updateColorLegend(minVal, maxVal);
    
    // Update tooltip callbacks to show color-coded values
    chart.options.plugins.tooltip.callbacks.label = function(context) {
        const point = context.raw;
        const colorVal = colorValues[context.dataIndex];
        const formattedColorVal = colorVal !== undefined ? colorVal.toFixed(2) : 'N/A';
        
        let colorStyle = '';
        if (colorVal < 0) {
            colorStyle = 'color: blue;';
        } else if (colorVal > 0) {
            colorStyle = 'color: red;';
        }
        
        return [
            `X: ${point.originalLabel || point.x}`,
            `Y: ${point.y}`,
            `<span style="${colorStyle}">Value: ${formattedColorVal}</span>`
        ];
    };
    
    // Make sure tooltips use HTML
    chart.options.plugins.tooltip.enabled = false;
    chart.options.plugins.tooltip.external = function(context) {
        // External tooltip implementation
        let tooltipEl = document.getElementById('chartjs-tooltip');
        
        // Create the tooltip element if it doesn't exist
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.innerHTML = '<table></table>';
            document.body.appendChild(tooltipEl);
        }
        
        // Hide if no tooltip
        const tooltipModel = context.tooltip;
        if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }
        
        // Set text
        if (tooltipModel.body) {
            const titleLines = tooltipModel.title || [];
            const bodyLines = tooltipModel.body.map(b => b.lines);
            
            let innerHtml = '<thead>';
            
            titleLines.forEach(function(title) {
                innerHtml += '<tr><th>' + title + '</th></tr>';
            });
            innerHtml += '</thead><tbody>';
            
            bodyLines.forEach(function(body, i) {
                body.forEach(function(line) {
                    innerHtml += '<tr><td>' + line + '</td></tr>';
                });
            });
            innerHtml += '</tbody>';
            
            const tableRoot = tooltipEl.querySelector('table');
            tableRoot.innerHTML = innerHtml;
        }
        
        // Position tooltip and set styles
        tooltipEl.style.opacity = 1;
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.left = tooltipModel.caretX + 'px';
        tooltipEl.style.top = tooltipModel.caretY + 'px';
        tooltipEl.style.padding = tooltipModel.padding + 'px ' + tooltipModel.padding + 'px';
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        tooltipEl.style.border = '1px solid #ccc';
        tooltipEl.style.borderRadius = '3px';
        tooltipEl.style.fontFamily = tooltipModel.options.bodyFont.family;
        tooltipEl.style.fontSize = tooltipModel.options.bodyFont.size + 'px';
    };
}

// Function to update Y-axis scale for scatter plots
function updateScatterYAxisScale(chartInstance, visibleData) {
    // Extract Y values from scatter datasets
    let allYValues = [];
    
    chartInstance.data.datasets.forEach(dataset => {
        const yValues = dataset.data.map(point => point.y).filter(val => !isNaN(val));
        allYValues = allYValues.concat(yValues);
    });
    
    if (allYValues.length > 0) {
        // Calculate min and max values
        let minY = Math.min(...allYValues);
        let maxY = Math.max(...allYValues);
        
        // Only update if there's a meaningful range
        const range = maxY - minY;
        if (range > 0) {
            // Add some padding based on data range
            const padding = range * 0.05; // 5% padding
            
            chartInstance.options.scales.y.suggestedMin = minY - padding;
            chartInstance.options.scales.y.suggestedMax = maxY + padding;
        }
    }
}

// Function to update Y-axis scale for standard charts
function updateStandardYAxisScale(chartInstance, visibleData) {
    if (visibleData.length > 0) {
        const yValues = visibleData.filter(val => !isNaN(val));
        if (yValues.length > 0) {
            // Calculate min and max values
            let minY = Math.min(...yValues);
            let maxY = Math.max(...yValues);
            
            // Only update if there's a meaningful range
            const range = maxY - minY;
            if (range > 0) {
                // Add some padding based on data range
                const padding = range * 0.05; // 5% padding
                
                chartInstance.options.scales.y.suggestedMin = minY - padding;
                chartInstance.options.scales.y.suggestedMax = maxY + padding;
            }
        }
    }
}

// Function to update the position indicator
function updatePositionIndicator(start, end, total) {
    // Update text display
    if (dataPositionSpan) {
        dataPositionSpan.textContent = `${start + 1} - ${end} of ${total}`;
    }
    
    // Update chart title to show position
    if (chartInstance && chartInstance.options.plugins.title.originalText) {
        const scrollPercent = Math.round((start / Math.max(1, total - MAX_DISPLAY_POINTS)) * 100);
        chartInstance.options.plugins.title.text = 
            `${chartInstance.options.plugins.title.originalText} (Position: ${scrollPercent}%)`;
    }
    
    // Enable/disable navigation buttons based on position
    if (scrollLeftBtn) {
        scrollLeftBtn.disabled = start === 0;
    }
    
    if (scrollRightBtn) {
        scrollRightBtn.disabled = end >= total;
    }
}

// Function to handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log("Loading file:", file.name);
    
    // Parse CSV file
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Automatically convert numerical values
        complete: function(results) {
            csvData = results.data;
            headers = results.meta.fields;
            
            console.log("CSV loaded with headers:", headers);
            console.log("First row:", csvData[0]);
            
            // Normalize header case for time column
            // Some CSV files use 'Time' instead of 'time'
            const timeColumnIndex = headers.findIndex(h => h.toLowerCase() === 'time');
            if (timeColumnIndex >= 0 && headers[timeColumnIndex] !== 'time') {
                console.log(`Found time column with name "${headers[timeColumnIndex]}"`);
                // We'll keep the original name but ensure proper handling in processTimeData
            }
            
            // Process time data if present
            processTimeData();
            
            // Display data preview
            displayDataPreview();
            
            // Populate axis dropdowns
            populateAxisDropdowns();
            
            // Update axis options based on selected graph type
            updateAxisOptions();
        },
        error: function(error) {
            console.error('Error parsing CSV:', error);
            alert('Error parsing CSV file. Please check the file format.');
        }
    });
}

// Function to process time data in the CSV
function processTimeData() {
    if (!csvData || csvData.length === 0) return;
    
    // Check if we have a time column (in any case)
    const timeColumnName = headers.find(h => h.toLowerCase() === 'time');
    if (!timeColumnName) {
        console.log("No time column found in CSV");
        return;
    }
    
    console.log("Processing time data...");
    
    // Add a new formatted time column for display
    csvData.forEach(row => {
        if (row[timeColumnName]) {
            // Store the original time string
            row.original_time = String(row[timeColumnName]);
            
            try {
                // Try to handle various time formats
                let dateObj;
                
                // Check if it's already a Date object
                if (row[timeColumnName] instanceof Date) {
                    dateObj = row[timeColumnName];
                } else {
                    // Handle string formats like "2023-01-02 01:00:00"
                    const timeStr = String(row[timeColumnName]).trim();
                    
                    // Log the first few time strings for debugging
                    if (csvData.indexOf(row) < 5) {
                        console.log(`Processing time string: "${timeStr}"`);
                    }
                    
                    // Try standard ISO date parsing first
                    dateObj = new Date(timeStr);
                    
                    // If parsing failed with standard approach, try manual parsing
                    if (isNaN(dateObj.getTime())) {
                        console.log("Failed to parse date with standard method:", timeStr);
                        
                        // Try parsing with regex
                        // This handles formats like "2024-01-01 18:00:00"
                        const regex = /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;
                        const match = timeStr.match(regex);
                        
                        if (match) {
                            // match[1] = year, match[2] = month, etc.
                            const year = parseInt(match[1]);
                            const month = parseInt(match[2]) - 1; // Months are 0-based in JS
                            const day = parseInt(match[3]);
                            const hour = parseInt(match[4]);
                            const minute = parseInt(match[5]);
                            const second = parseInt(match[6]);
                            
                            dateObj = new Date(year, month, day, hour, minute, second);
                            
                            if (csvData.indexOf(row) < 5) {
                                console.log(`Manual parsing: ${year}-${month+1}-${day} ${hour}:${minute}:${second} => ${dateObj}`);
                            }
                        } else {
                            // Try splitting on common separators if regex failed
                            const parts = timeStr.split(/[\s-:\/]/g).filter(p => p.trim() !== '');
                            
                            if (parts.length >= 6) {
                                // Assume parts are [year, month, day, hour, minute, second]
                                dateObj = new Date(
                                    parseInt(parts[0]), // year
                                    parseInt(parts[1]) - 1, // month (0-based)
                                    parseInt(parts[2]), // day
                                    parseInt(parts[3]), // hour
                                    parseInt(parts[4]), // minute
                                    parseInt(parts[5])  // second
                                );
                                
                                if (csvData.indexOf(row) < 5) {
                                    console.log(`Parts parsing: ${parts.join('/')} => ${dateObj}`);
                                }
                            }
                        }
                    }
                }
                
                // If we have a valid date object
                if (dateObj && !isNaN(dateObj.getTime())) {
                    // Store formatted time data
                    row[timeColumnName] = dateObj;
                    row.time = dateObj; // Ensure we have a standard 'time' property
                    row.time_formatted = dateObj.toLocaleString();
                    row.date_only = dateObj.toLocaleDateString();
                    row.time_only = dateObj.toLocaleTimeString();
                    row.timestamp = dateObj.getTime();
                } else {
                    console.warn("Could not parse time:", row.original_time);
                }
            } catch (e) {
                console.error("Error processing time:", e, "for value:", row.original_time);
            }
        }
    });
    
    // Add the new headers if not already present
    if (!headers.includes('time_formatted')) {
        headers.push('time_formatted', 'date_only', 'time_only', 'timestamp');
    }
    
    // Ensure we have a standard 'time' header if it doesn't exist
    if (!headers.includes('time') && timeColumnName !== 'time') {
        headers.push('time');
    }
    
    console.log("Time processing complete");
}

// Function to display data preview
function displayDataPreview() {
    if (!csvData || csvData.length === 0) return;
    
    // Create table element
    const table = document.createElement('table');
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Display only the original headers for simplicity
    const displayHeaders = headers.filter(h => 
        !['timestamp', 'time_formatted', 'date_only', 'time_only'].includes(h));
    
    displayHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Display up to 10 rows as preview
    const previewRows = csvData.slice(0, 10);
    
    previewRows.forEach(row => {
        const tr = document.createElement('tr');
        
        displayHeaders.forEach(header => {
            const td = document.createElement('td');
            
            // Format Date objects for display
            if (header === 'time' && row[header] instanceof Date) {
                td.textContent = row.time_formatted || row[header].toLocaleString();
            } else {
                td.textContent = row[header];
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    
    // Clear previous content and append table
    dataTableContainer.innerHTML = '';
    dataTableContainer.appendChild(table);
}

// Function to populate axis dropdowns
function populateAxisDropdowns() {
    if (!headers || headers.length === 0) return;
    
    // Clear previous options
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    colorAxisSelect.innerHTML = '<option value="">No Color Grouping</option>';
    
    // Add options for each header
    headers.forEach(header => {
        // Skip the internal time format headers for cleaner UI
        if (['time_formatted', 'original_time'].includes(header)) return;
        
        const xOption = document.createElement('option');
        xOption.value = header;
        xOption.textContent = header;
        
        const yOption = document.createElement('option');
        yOption.value = header;
        yOption.textContent = header;
        
        const colorOption = document.createElement('option');
        colorOption.value = header;
        colorOption.textContent = header;
        
        xAxisSelect.appendChild(xOption);
        yAxisSelect.appendChild(yOption);
        colorAxisSelect.appendChild(colorOption);
    });
    
    // Select time-related columns as X-axis by default if available
    // Handle both 'time' and 'Time' (case-insensitive)
    const timeColumnIndex = headers.findIndex(h => h.toLowerCase() === 'time');
    
    if (headers.includes('timestamp')) {
        xAxisSelect.value = 'timestamp';
    } else if (timeColumnIndex >= 0) {
        xAxisSelect.value = headers[timeColumnIndex];
    }
    
    // Select a numerical column for Y-axis by default (if available)
    // For VOP file, try vop_* columns first
    const vopColumns = headers.filter(h => h.startsWith('vop_'));
    
    if (vopColumns.length > 0) {
        // Select the first vop column
        yAxisSelect.value = vopColumns[0];
    } else {
        // Fall back to other financial columns
        const numericalColumns = ['close', 'Close', 'high', 'High', 'low', 'Low', 'open', 'Open', 'tick_volume', 'real_volume'];
        for (const col of numericalColumns) {
            if (headers.includes(col)) {
                yAxisSelect.value = col;
                break;
            }
        }
    }
}

// Function to update axis options based on graph type
function updateAxisOptions() {
    const graphType = graphTypeSelect.value;
    
    // Hide or show X-axis and Y-axis selects based on graph type
    if (graphType === 'pie') {
        document.querySelector('label[for="x-axis"]').textContent = 'Labels:';
        document.querySelector('label[for="y-axis"]').textContent = 'Values:';
        colorGroup.style.display = 'none';
        colorNormalizeGroup.style.display = 'none';
    } else {
        document.querySelector('label[for="x-axis"]').textContent = 'X-Axis:';
        document.querySelector('label[for="y-axis"]').textContent = 'Y-Axis:';
        
        // Show color option for scatter and bubble plots
        if (graphType === 'scatter' || graphType === 'bubble') {
            colorGroup.style.display = 'block';
            // Update color options based on current selection
            updateColorOptions();
        } else {
            colorGroup.style.display = 'none';
            colorNormalizeGroup.style.display = 'none';
        }
    }
    
    // Reset current view position when graph type changes
    currentDataStart = 0;
}

// Function to update color options based on color axis selection
function updateColorOptions() {
    if (colorAxisSelect.value) {
        // Show normalize options when a color axis is selected
        colorNormalizeGroup.style.display = 'block';
        
        // Try to analyze color values to suggest min/max if numerical
        if (csvData && csvData.length > 0) {
            const colorValues = csvData.map(row => {
                const val = row[colorAxisSelect.value];
                return typeof val === 'number' ? val : parseFloat(val);
            }).filter(val => !isNaN(val));
            
            if (colorValues.length > 0) {
                const min = Math.min(...colorValues);
                const max = Math.max(...colorValues);
                
                // Set placeholder values
                minValueInput.setAttribute('placeholder', min.toFixed(2));
                maxValueInput.setAttribute('placeholder', max.toFixed(2));
                
                // If values span across zero, suggest normalizing
                if (min < 0 && max > 0) {
                    colorNormalizeCheckbox.checked = true;
                    toggleNormalizeRange();
                }
            }
        }
    } else {
        // Hide normalize options when no color axis is selected
        colorNormalizeGroup.style.display = 'none';
        colorNormalizeCheckbox.checked = false;
        toggleNormalizeRange();
    }
}

// Function to toggle normalize range inputs
function toggleNormalizeRange() {
    normalizeRange.style.display = colorNormalizeCheckbox.checked ? 'block' : 'none';
}

// Function to display error message to the user
function displayError(message, error) {
    // Log to console
    console.error(message, error);
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    errorElement.style.color = 'darkred';
    errorElement.style.padding = '10px';
    errorElement.style.margin = '10px 0';
    errorElement.style.borderRadius = '4px';
    errorElement.style.border = '1px solid red';
    
    // Add error message
    errorElement.innerHTML = `
        <h3 style="margin-top: 0;">Error</h3>
        <p>${message}</p>
        ${error ? `<details>
            <summary>Technical Details</summary>
            <pre style="white-space: pre-wrap;">${error.toString()}</pre>
        </details>` : ''}
    `;
    
    // Add to page before the graph
    graphContainer.parentNode.insertBefore(errorElement, graphContainer);
    
    // Remove after 10 seconds
    setTimeout(() => {
        errorElement.remove();
    }, 10000);
}

// Function to generate the graph
function generateGraph() {
    if (!csvData || csvData.length === 0) {
        alert('Please upload a CSV file first.');
        return;
    }
    
    try {
        console.log("Generating graph with data:", csvData.length, "rows");
        
        const graphType = graphTypeSelect.value;
        const xAxis = xAxisSelect.value;
        const yAxis = yAxisSelect.value;
        const colorAxis = colorAxisSelect.value;
        
        // Get normalization settings
        normalizeColors = colorNormalizeCheckbox.checked && colorAxis;
        colorMinValue = minValueInput.value ? parseFloat(minValueInput.value) : null;
        colorMaxValue = maxValueInput.value ? parseFloat(maxValueInput.value) : null;
        
        // Clean up any existing color legend
        cleanupColorLegend();
        
        // Remove any existing error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        
        console.log("Selected axes:", xAxis, yAxis, "Color by:", colorAxis, 
                   "Normalize:", normalizeColors, "Range:", colorMinValue, colorMaxValue);
        
        // Reset data view position
        currentDataStart = 0;
        
        // Prepare data for the chart
        let labels = [];
        let data = [];
        let colorData = [];
        let xValues = []; // Store actual x-values for scatter plots
        
        // Check if we're using a time-based column (case-insensitive)
        const isTimeColumn = xAxis.toLowerCase() === 'time' || 
                             xAxis.toLowerCase() === 'timestamp' || 
                             xAxis === 'Time';
        
        console.log("Is time column:", isTimeColumn, "Column name:", xAxis);
        
        // Special handling for time-based x-axis
        if (isTimeColumn) {
            console.log("Using time-based x-axis");
            
            // Filter out any rows with invalid time data
            const validData = csvData.filter(row => {
                if (xAxis.toLowerCase() === 'timestamp') {
                    return row.timestamp !== undefined && !isNaN(row.timestamp);
                } else {
                    // Check for time in the row using various property names
                    return (row.time instanceof Date && !isNaN(row.time.getTime())) || 
                           (row[xAxis] instanceof Date && !isNaN(row[xAxis].getTime()));
                }
            });
            
            if (validData.length === 0) {
                console.error("No valid time data found. Available data:", 
                             csvData.slice(0, 3).map(r => JSON.stringify(r)));
                alert("No valid time data found for graphing. Please check the CSV format.");
                return;
            }
            
            console.log("Valid time data rows:", validData.length);
            console.log("First few valid rows:", validData.slice(0, 3).map(r => ({
                [xAxis]: r[xAxis],
                time: r.time,
                timestamp: r.timestamp
            })));
            
            // For time series, we need to sort the data chronologically
            const sortedData = [...validData].sort((a, b) => {
                let timeA, timeB;
                
                if (xAxis.toLowerCase() === 'timestamp') {
                    timeA = a.timestamp;
                    timeB = b.timestamp;
                } else if (a.time instanceof Date) {
                    timeA = a.time.getTime();
                    timeB = b.time.getTime();
                } else {
                    timeA = a[xAxis].getTime();
                    timeB = b[xAxis].getTime();
                }
                
                return timeA - timeB;
            });
            
            // Use appropriate time format for display
            if (xAxis.toLowerCase() === 'time' || xAxis === 'Time') {
                labels = sortedData.map(row => {
                    const timeObj = row.time instanceof Date ? row.time : row[xAxis];
                    
                    if (timeObj instanceof Date) {
                        // Format based on data density
                        const timeSpan = sortedData[sortedData.length-1].time.getTime() - 
                                        sortedData[0].time.getTime();
                        const isMultipleDays = timeSpan > (24 * 60 * 60 * 1000);
                        
                        if (isMultipleDays) {
                            return timeObj.toLocaleDateString();
                        } else {
                            return timeObj.toLocaleTimeString();
                        }
                    }
                    return row.time_formatted || row.original_time;
                });
            } else {
                // For timestamp, convert to readable date
                labels = sortedData.map(row => new Date(row.timestamp).toLocaleString());
            }
            
            // Get corresponding y values
            data = sortedData.map(row => {
                const value = parseFloat(row[yAxis]);
                return isNaN(value) ? 0 : value;
            });
            
            // For color grouping, get the corresponding color values
            if (colorAxis && (graphType === 'scatter' || graphType === 'bubble')) {
                colorData = sortedData.map(row => row[colorAxis]);
            }
            
            // For scatter plots, store the actual x values
            if (graphType === 'scatter' || graphType === 'bubble') {
                xValues = sortedData.map(row => {
                    // For time x-axis in scatter, we'll use the timestamp
                    const timeObj = row.time instanceof Date ? row.time : row[xAxis];
                    if (timeObj instanceof Date) {
                        return timeObj.getTime(); // Use timestamp for Chart.js
                    } else if (xAxis.toLowerCase() === 'timestamp') {
                        return row.timestamp;
                    } else {
                        return (parseFloat(row[xAxis]) || 0);
                    }
                });
                
                console.log("Generated xValues from timestamps:", xValues.slice(0, 5));
            }
        } else {
            // Standard handling for non-time axes
            labels = csvData.map(row => row[xAxis]);
            
            // For scatter plots, store the actual x values
            if (graphType === 'scatter' || graphType === 'bubble') {
                xValues = csvData.map(row => {
                    const value = parseFloat(row[xAxis]);
                    return isNaN(value) ? row[xAxis] : value;
                });
            }
            
            data = csvData.map(row => {
                const value = parseFloat(row[yAxis]);
                return isNaN(value) ? 0 : value;
            });
            
            // For color grouping, get the corresponding color values
            if (colorAxis && (graphType === 'scatter' || graphType === 'bubble')) {
                colorData = csvData.map(row => row[colorAxis]);
            }
        }
        
        // Store the full dataset for scrolling
        fullDataset = {
            labels: labels,
            data: data,
            colorData: colorData,
            xValues: xValues
        };
        
        // Adjust MAX_DISPLAY_POINTS based on data size
        // For very large datasets, show fewer points at once for better performance
        const dataLength = labels.length;
        let displayPoints = MAX_DISPLAY_POINTS;
        
        if (dataLength > 10000) {
            displayPoints = 30; // Fewer points for very large datasets
        } else if (dataLength > 5000) {
            displayPoints = 40; // Moderate points for large datasets
        } else if (dataLength < 100) {
            displayPoints = dataLength; // Show all points for small datasets
        }
        
        // Get the visible data window based on adjusted display points
        const visibleLabels = labels.length > displayPoints 
            ? labels.slice(0, displayPoints) 
            : labels;
        
        const visibleData = data.length > displayPoints 
            ? data.slice(0, displayPoints) 
            : data;
            
        const visibleColorData = colorData.length > displayPoints 
            ? colorData.slice(0, displayPoints) 
            : colorData;
            
        const visibleXValues = xValues.length > displayPoints
            ? xValues.slice(0, displayPoints)
            : xValues;
        
        // Generate colors for datasets
        const colors = generateColors(visibleData.length);
        
        // Destroy previous chart instance if exists
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Create chart configuration
        const chartConfig = createChartConfig(
            graphType, 
            visibleLabels, 
            visibleData, 
            xAxis, 
            yAxis, 
            colors, 
            visibleColorData, 
            colorAxis,
            visibleXValues
        );
        
        // Create new chart with try-catch
        try {
            chartInstance = new Chart(graphCanvas, chartConfig);
            
            // Store original title for reference
            chartInstance.options.plugins.title.originalText = chartInstance.options.plugins.title.text;
            
            // If using normalized colors for scatter plot, update the colors immediately
            if (normalizeColors && (graphType === 'scatter' || graphType === 'bubble') && colorAxis) {
                // Allow chart to initialize first
                setTimeout(() => {
                    updateScatterWithNormalizedColors(chartInstance, visibleData, visibleColorData, visibleXValues, visibleLabels);
                    chartInstance.update();
                }, 10);
            }
            
            // Show/hide data controls based on dataset size
            if (labels.length > displayPoints) {
                dataControls.style.display = 'flex';
                graphContainer.classList.add('scrollable');
                updatePositionIndicator(0, Math.min(displayPoints, labels.length), labels.length);
            } else {
                dataControls.style.display = 'none';
                graphContainer.classList.remove('scrollable');
            }
        } catch (chartError) {
            displayError("Failed to create chart. Try a different chart type or axis selection.", chartError);
            console.error("Chart creation error:", chartError);
        }
    } catch (error) {
        displayError("An error occurred while generating the graph.", error);
        console.error("Graph generation error:", error);
    }
}

// Helper function to determine scale type based on data
function determineScaleType(xValues, isTimeAxis) {
    // If we know it's a time axis, prefer time scale for numeric values
    if (isTimeAxis && xValues && xValues.length > 0 && typeof xValues[0] === 'number') {
        if (xValues[0] > 946684800000) { // Year 2000 timestamp (indicates a true timestamp)
            return 'time';
        }
        return 'linear';
    }
    
    // For non-time numeric data, use linear scale
    if (xValues && xValues.length > 0 && typeof xValues[0] === 'number') {
        return 'linear';
    }
    
    // Default to category for non-numeric data
    return 'category';
}

// Generate colors for data groups
function generateGroupColor(index, totalGroups) {
    // Use a color palette that works well for grouping
    const colorPalettes = [
        // Tableau 10 palette
        [
            'rgba(31, 119, 180, 0.7)',  // Blue
            'rgba(255, 127, 14, 0.7)',  // Orange
            'rgba(44, 160, 44, 0.7)',   // Green
            'rgba(214, 39, 40, 0.7)',   // Red
            'rgba(148, 103, 189, 0.7)', // Purple
            'rgba(140, 86, 75, 0.7)',   // Brown
            'rgba(227, 119, 194, 0.7)', // Pink
            'rgba(127, 127, 127, 0.7)', // Gray
            'rgba(188, 189, 34, 0.7)',  // Olive
            'rgba(23, 190, 207, 0.7)'   // Cyan
        ],
        // For more than 10 groups, use a gradient-based approach
        []
    ];
    
    // For small number of groups, use the predefined palette
    if (totalGroups <= 10) {
        return colorPalettes[0][index % 10];
    }
    
    // For larger datasets, generate colors using HSL for better distribution
    const hue = (index * (360 / totalGroups)) % 360;
    return `hsla(${hue}, 70%, 60%, 0.7)`;
}

// Function to generate colors
function generateColors(count) {
    const colors = [];
    
    // For single color (line, bar charts)
    if (count === 1) {
        return ['rgba(52, 152, 219, 0.7)'];
    }
    
    // For multiple colors (pie chart)
    const baseColors = [
        'rgba(52, 152, 219, 0.7)',   // Blue
        'rgba(46, 204, 113, 0.7)',   // Green
        'rgba(231, 76, 60, 0.7)',    // Red
        'rgba(155, 89, 182, 0.7)',   // Purple
        'rgba(241, 196, 15, 0.7)',   // Yellow
        'rgba(230, 126, 34, 0.7)',   // Orange
        'rgba(26, 188, 156, 0.7)',   // Turquoise
        'rgba(149, 165, 166, 0.7)'   // Gray
    ];
    
    // Reuse colors if we need more than the base set
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
}

// Function to clean up color legend
function cleanupColorLegend() {
    // Remove any existing color legend
    const existingLegend = document.querySelector('.color-gradient-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
}

// Function to update or create color legend
function updateColorLegend(minVal, maxVal) {
    // Clean up any existing legend first
    cleanupColorLegend();
    
    // Create new legend container
    const legendContainer = document.createElement('div');
    legendContainer.className = 'color-gradient-legend';
    legendContainer.style.position = 'absolute';
    legendContainer.style.right = '10px';
    legendContainer.style.top = '50px';
    legendContainer.style.width = '30px';
    legendContainer.style.height = '200px';
    legendContainer.style.background = 'linear-gradient(to top, blue, white, red)';
    legendContainer.style.borderRadius = '4px';
    legendContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
    legendContainer.style.zIndex = '10';
    
    // Add scale values
    const minLabel = document.createElement('div');
    minLabel.style.position = 'absolute';
    minLabel.style.bottom = '0';
    minLabel.style.right = '35px';
    minLabel.style.fontSize = '12px';
    minLabel.textContent = minVal.toFixed(1);
    
    const zeroLabel = document.createElement('div');
    zeroLabel.style.position = 'absolute';
    zeroLabel.style.top = '50%';
    zeroLabel.style.right = '35px';
    zeroLabel.style.fontSize = '12px';
    zeroLabel.style.transform = 'translateY(-50%)';
    zeroLabel.textContent = '0';
    
    const maxLabel = document.createElement('div');
    maxLabel.style.position = 'absolute';
    maxLabel.style.top = '0';
    maxLabel.style.right = '35px';
    maxLabel.style.fontSize = '12px';
    maxLabel.textContent = maxVal.toFixed(1);
    
    legendContainer.appendChild(minLabel);
    legendContainer.appendChild(zeroLabel);
    legendContainer.appendChild(maxLabel);
    
    // Add to the container
    graphContainer.appendChild(legendContainer);
}

// Update destroy chart instance to clean up color legend
const originalDestroyFunction = Chart.prototype.destroy;
Chart.prototype.destroy = function() {
    cleanupColorLegend();
    return originalDestroyFunction.apply(this, arguments);
};

// Function to create chart configuration
function createChartConfig(type, labels, data, xAxisLabel, yAxisLabel, colors, colorData, colorAxis, xValues) {
    // Handle dot plot (bubble) chart type
    if (type === 'bubble') {
        // For dot plot, we'll use scatter type with fixed size points
        type = 'scatter';
    }
    
    // Debug information
    console.log(`Creating chart config: type=${type}, data length=${data.length}, colorData length=${colorData ? colorData.length : 0}`);
    console.log("Sample xValues:", xValues?.slice(0, 3));
    
    // Check if x-axis is time-based
    const isTimeAxis = xAxisLabel.toLowerCase() === 'time' || 
                       xAxisLabel.toLowerCase() === 'timestamp' || 
                       xAxisLabel === 'Time';
    
    // Determine scale type - set to category for now to avoid time scale issues
    let scaleType = determineScaleType(xValues, isTimeAxis);
    
    // Override scale type to 'category' for safety if we're having issues with the time scale
    // This will ensure the chart displays even if time parsing is problematic
    if (scaleType === 'time') {
        console.log("Using category scale instead of time scale for better compatibility");
        scaleType = 'category';
    }
    
    console.log(`Using scale type: ${scaleType} for x-axis ${xAxisLabel}`);
    
    const config = {
        type: type,
        data: {
            labels: labels
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${yAxisLabel} vs ${xAxisLabel}`
                },
                legend: {
                    display: type === 'pie' || (colorAxis && (type === 'scatter') && !normalizeColors)
                },
                tooltip: {
                    intersect: false,
                    mode: 'nearest',
                    callbacks: {}
                }
            }
        }
    };
    
    // Add default elements options for scatter plots to allow custom point colors
    if (type === 'scatter') {
        config.options.elements = {
            point: {
                radius: graphTypeSelect.value === 'bubble' ? 5 : 3,
                hoverRadius: graphTypeSelect.value === 'bubble' ? 7 : 5
            }
        };
    }
    
    // Configure datasets based on chart type
    if (type === 'pie') {
        config.data.datasets = [{
            data: data,
            backgroundColor: colors
        }];
    } else if (type === 'scatter') {
        // Handle scatter/dot plot
        const isDotPlot = graphTypeSelect.value === 'bubble';
        
        try {
            // Debug - check if we have valid data
            console.log("Building scatter plot datasets with:");
            console.log("- Data points:", data.length);
            console.log("- X values:", xValues?.length);
            console.log("- Sample y values:", data.slice(0, 3));
            
            // When using color grouping for scatter/dot plots
            if (colorAxis && colorData && colorData.length > 0) {
                if (normalizeColors) {
                    // For normalized colors, the initial setup
                    const scatterData = [];
                    
                    // Generate point data safely
                    for (let i = 0; i < data.length; i++) {
                        const y = data[i];
                        const x = xValues && i < xValues.length ? xValues[i] : i;
                        const label = labels && i < labels.length ? labels[i] : '';
                        
                        scatterData.push({
                            x: x,
                            y: y,
                            originalLabel: label
                        });
                    }
                    
                    // For normalized colors, the array of colors will be set by updateScatterWithNormalizedColors
                    config.data.datasets = [{
                        label: yAxisLabel,
                        data: scatterData,
                        backgroundColor: colors[0],
                        borderColor: colors[0],
                        pointRadius: isDotPlot ? 5 : 3,
                        pointHoverRadius: isDotPlot ? 7 : 5,
                        pointStyle: isDotPlot ? 'circle' : 'cross',
                        showLine: false
                    }];
                    
                    console.log("Created scatter dataset with normalized colors:", scatterData.length, "points");
                } else {
                    // Get unique color values
                    const uniqueColorValues = [...new Set(colorData.filter(v => v !== null && v !== undefined))];
                    
                    // If we have grouped data
                    if (uniqueColorValues.length > 0) {
                        // Clear existing datasets
                        config.data.datasets = [];
                        
                        // Create a dataset for each unique color value
                        uniqueColorValues.forEach((colorValue, groupIndex) => {
                            const groupData = [];
                            const baseColor = generateGroupColor(groupIndex, uniqueColorValues.length);
                            
                            // Create data points for this color group
                            data.forEach((y, i) => {
                                if (colorData[i] === colorValue) {
                                    // Use actual x values if available, otherwise use index
                                    const xVal = xValues && xValues.length > i ? xValues[i] : i;
                                    groupData.push({ 
                                        x: xVal, 
                                        y: y,
                                        originalLabel: labels[i]
                                    });
                                }
                            });
                            
                            // Add dataset for this group
                            config.data.datasets.push({
                                label: `${colorValue}`,
                                data: groupData,
                                backgroundColor: baseColor,
                                borderColor: baseColor,
                                pointRadius: isDotPlot ? 5 : 3,
                                pointHoverRadius: isDotPlot ? 7 : 5,
                                pointStyle: isDotPlot ? 'circle' : 'cross',
                                showLine: false
                            });
                        });
                        
                        // Make sure legend is visible for color groups
                        config.options.plugins.legend.display = true;
                    }
                }
            } else {
                // Standard scatter plot (no color grouping)
                const scatterData = [];
                
                // Generate point data safely
                for (let i = 0; i < data.length; i++) {
                    const y = data[i];
                    const x = xValues && i < xValues.length ? xValues[i] : i;
                    const label = labels && i < labels.length ? labels[i] : '';
                    
                    scatterData.push({
                        x: x,
                        y: y,
                        originalLabel: label
                    });
                }
                
                config.data.datasets = [{
                    label: yAxisLabel,
                    data: scatterData,
                    backgroundColor: colors[0],
                    borderColor: colors[0],
                    pointRadius: isDotPlot ? 5 : 3,
                    pointHoverRadius: isDotPlot ? 7 : 5,
                    pointStyle: isDotPlot ? 'circle' : 'cross',
                    showLine: false
                }];
                
                console.log("Created standard scatter dataset:", scatterData.length, "points");
                
                // Customize tooltips for scatter plots
                config.options.plugins.tooltip.callbacks = {
                    title: function(tooltipItems) {
                        const item = tooltipItems[0];
                        const dataPoint = item.raw;
                        
                        // Use the original label if available
                        if (dataPoint && dataPoint.originalLabel !== undefined) {
                            return dataPoint.originalLabel;
                        }
                        
                        // Special handling for time-based x values (timestamps)
                        if (isTimeAxis && dataPoint && typeof dataPoint.x === 'number' && dataPoint.x > 946684800000) { // Year 2000 timestamp
                            return new Date(dataPoint.x).toLocaleString();
                        }
                        
                        // Fallback to x value
                        return item.label || '';
                    },
                    label: function(context) {
                        return `${yAxisLabel}: ${context.raw.y}`;
                    }
                };
            }
        } catch (error) {
            console.error("Error creating scatter plot datasets:", error);
            // Provide a fallback dataset to prevent chart generation failure
            config.data.datasets = [{
                label: "Error in data processing",
                data: [],
                backgroundColor: 'rgba(255, 0, 0, 0.5)'
            }];
        }
        
        // For scatter, we need to use different scales configuration
        config.options.scales = {
            x: {
                type: scaleType,
                position: 'bottom',
                title: {
                    display: true,
                    text: xAxisLabel
                }
            },
            y: {
                title: {
                    display: true,
                    text: yAxisLabel
                },
                beginAtZero: false, // Allow the scale to not start at zero
                grace: '5%' // Add a little padding at top and bottom
            }
        };
        
        // Configure time scale options if using time scale
        if (scaleType === 'time') {
            // For time scale, we need to ensure Chart.js can handle Date objects
            config.options.scales.x.time = {
                unit: 'minute',
                displayFormats: {
                    minute: 'HH:mm',
                    hour: 'MMM d, HH:mm',
                    day: 'MMM d'
                }
            };
            
            // Improve tick display for time scale
            config.options.scales.x.ticks = {
                source: 'auto',
                maxRotation: 45,
                autoSkip: true
            };
            
            // Convert timestamp numbers to Date objects for Chart.js
            config.data.datasets.forEach(dataset => {
                if (dataset.data && dataset.data.length > 0) {
                    dataset.data.forEach(point => {
                        if (point && typeof point.x === 'number' && point.x > 946684800000) {
                            // Convert the timestamp to a Date object in-place
                            point.x = new Date(point.x);
                        }
                    });
                }
            });
            
            console.log("Converted timestamps to Date objects for Chart.js time scale");
        } else {
            // For non-time scales, use standard tick configuration
            config.options.scales.x.ticks = {
                maxRotation: 45,
                minRotation: 45,
                autoSkip: true,
                maxTicksLimit: 20
            };
        }
        
        // Calculate good Y-axis min/max values for scatter/dot plot
        if (data.length > 0) {
            // If using color grouping, we need to get all Y values from all datasets
            let allYValues = [];
            
            if (colorAxis && config.data.datasets.length > 1) {
                config.data.datasets.forEach(dataset => {
                    const yValues = dataset.data.map(point => point.y).filter(val => !isNaN(val));
                    allYValues = allYValues.concat(yValues);
                });
            } else {
                allYValues = data.filter(val => !isNaN(val));
            }
            
            if (allYValues.length > 0) {
                // Calculate min and max values
                let minY = Math.min(...allYValues);
                let maxY = Math.max(...allYValues);
                
                // Only set suggestedMin/Max if there's a meaningful range
                const range = maxY - minY;
                if (range > 0) {
                    // Add some padding based on data range
                    const padding = range * 0.05; // 5% padding
                    
                    config.options.scales.y.suggestedMin = minY - padding;
                    config.options.scales.y.suggestedMax = maxY + padding;
                }
            }
        }
    } else {
        config.data.datasets = [{
            label: yAxisLabel,
            data: data,
            backgroundColor: colors[0],
            borderColor: type === 'line' ? colors[0] : undefined,
            fill: false,
            tension: type === 'line' ? 0.4 : undefined
        }];
        
        // Add scales for non-pie charts
        config.options.scales = {
            x: {
                title: {
                    display: true,
                    text: xAxisLabel
                }
            },
            y: {
                title: {
                    display: true,
                    text: yAxisLabel
                },
                beginAtZero: false, // Don't force y-axis to start at 0
                grace: '5%'  // Add padding at top and bottom of scale
            }
        };
        
        // For line and bar charts, add additional Y-axis configuration
        if (data.length > 0) {
            // Calculate good Y-axis min/max values from data
            const yValues = data.filter(val => !isNaN(val));
            if (yValues.length > 0) {
                // Calculate min and max values
                let minY = Math.min(...yValues);
                let maxY = Math.max(...yValues);
                
                // Only set suggestedMin/Max if there's a meaningful range
                const range = maxY - minY;
                if (range > 0) {
                    // Add some padding based on data range
                    const padding = range * 0.05; // 5% padding
                    
                    config.options.scales.y.suggestedMin = minY - padding;
                    config.options.scales.y.suggestedMax = maxY + padding;
                }
            }
        }
    }
    
    // Special configuration for time series in non-scatter charts
    if (isTimeAxis && type !== 'scatter') {
        // Optimize tick display for time series
        config.options.scales.x.type = 'category'; // Default to category for non-scatter time charts
        config.options.scales.x.ticks = {
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 20
        };
    }
    
    // Add scrolling UI elements to the config
    if (fullDataset.labels.length > MAX_DISPLAY_POINTS) {
        config.options.plugins.subtitle = {
            display: true,
            text: `Showing ${currentDataStart+1}-${Math.min(currentDataStart+MAX_DISPLAY_POINTS, fullDataset.labels.length)} of ${fullDataset.labels.length} data points`,
            padding: {
                bottom: 10
            }
        };
    }
    
    return config;
} 