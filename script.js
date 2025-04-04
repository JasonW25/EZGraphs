// Global variables
let csvData = null;
let headers = [];
let chartInstance = null;
let MAX_DISPLAY_POINTS = 50; // Default max points to display at once without scrolling
let NAVIGATION_STEP_SIZE = 10; // Default step size for navigation
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

// Add event listeners for display settings inputs
document.addEventListener('DOMContentLoaded', function() {
    // Check if the display settings inputs exist
    const displayPointsInput = document.getElementById('display-points');
    const stepSizeInput = document.getElementById('step-size');
    
    if (displayPointsInput && stepSizeInput) {
        // Set default values
        displayPointsInput.value = MAX_DISPLAY_POINTS;
        stepSizeInput.value = NAVIGATION_STEP_SIZE;
        
        // Add event listeners for input changes
        displayPointsInput.addEventListener('change', updateDisplaySettings);
        stepSizeInput.addEventListener('change', updateDisplaySettings);
    } else {
        console.log("Display settings inputs not found, will create them");
        createDisplaySettingsInputs();
    }
});

// Function to create display settings inputs if they don't exist
function createDisplaySettingsInputs() {
    // Create container for display settings
    const settingsContainer = document.createElement('div');
    settingsContainer.className = 'display-settings';
    settingsContainer.style.marginBottom = '15px';
    settingsContainer.style.display = 'flex';
    settingsContainer.style.alignItems = 'center';
    settingsContainer.style.gap = '15px';
    settingsContainer.style.flexWrap = 'wrap';
    
    // Create input for display points
    const pointsContainer = document.createElement('div');
    pointsContainer.className = 'settings-group';
    
    const pointsLabel = document.createElement('label');
    pointsLabel.htmlFor = 'display-points';
    pointsLabel.textContent = 'Points to Display:';
    pointsLabel.style.marginRight = '5px';
    
    const pointsInput = document.createElement('input');
    pointsInput.type = 'number';
    pointsInput.id = 'display-points';
    pointsInput.min = '10';
    pointsInput.max = '1000';
    pointsInput.value = MAX_DISPLAY_POINTS;
    pointsInput.style.width = '70px';
    
    pointsContainer.appendChild(pointsLabel);
    pointsContainer.appendChild(pointsInput);
    
    // Create input for step size
    const stepContainer = document.createElement('div');
    stepContainer.className = 'settings-group';
    
    const stepLabel = document.createElement('label');
    stepLabel.htmlFor = 'step-size';
    stepLabel.textContent = 'Navigation Step Size:';
    stepLabel.style.marginRight = '5px';
    
    const stepInput = document.createElement('input');
    stepInput.type = 'number';
    stepInput.id = 'step-size';
    stepInput.min = '1';
    stepInput.max = '500';
    stepInput.value = NAVIGATION_STEP_SIZE;
    stepInput.style.width = '70px';
    
    stepContainer.appendChild(stepLabel);
    stepContainer.appendChild(stepInput);
    
    // Create apply button
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply Settings';
    applyButton.className = 'btn';
    applyButton.style.marginLeft = '10px';
    applyButton.addEventListener('click', updateDisplaySettings);
    
    // Add all elements to the container
    settingsContainer.appendChild(pointsContainer);
    settingsContainer.appendChild(stepContainer);
    settingsContainer.appendChild(applyButton);
    
    // Find where to insert the settings
    const controlsContainer = document.querySelector('.controls-container') || 
                             document.querySelector('.graph-controls');
    
    if (controlsContainer) {
        // Insert settings at the end of controls
        controlsContainer.appendChild(settingsContainer);
        
        // Add event listeners
        pointsInput.addEventListener('change', updateDisplaySettings);
        stepInput.addEventListener('change', updateDisplaySettings);
    } else {
        // If controls container not found, insert before graph container
        const graphParent = graphContainer.parentNode;
        graphParent.insertBefore(settingsContainer, graphContainer);
    }
    
    // Add refresh button to data controls if they exist
    const dataControlsElement = document.querySelector('.data-controls');
    if (dataControlsElement) {
        enhanceDataControls(dataControlsElement);
    }
}

// Function to enhance data controls with additional functionality
function enhanceDataControls(dataControls) {
    // Update existing buttons to show step size
    if (scrollLeftBtn) {
        scrollLeftBtn.textContent = `← Previous (${NAVIGATION_STEP_SIZE})`;
        scrollLeftBtn.title = `Move back ${NAVIGATION_STEP_SIZE} data points`;
    }
    
    if (scrollRightBtn) {
        scrollRightBtn.textContent = `Next (${NAVIGATION_STEP_SIZE}) →`;
        scrollRightBtn.title = `Move forward ${NAVIGATION_STEP_SIZE} data points`;
    }
    
    // Add refresh button if it doesn't exist
    if (!document.getElementById('refresh-data')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refresh-data';
        refreshBtn.className = 'btn';
        refreshBtn.textContent = '↻ Refresh View';
        refreshBtn.title = 'Refresh the current data view';
        refreshBtn.style.marginLeft = '10px';
        
        refreshBtn.addEventListener('click', function() {
            if (chartInstance) {
                updateDisplaySettings();
            }
        });
        
        // Insert after position span
        if (dataPositionSpan && dataPositionSpan.parentNode) {
            dataPositionSpan.parentNode.insertBefore(refreshBtn, dataPositionSpan.nextSibling);
        } else {
            dataControls.appendChild(refreshBtn);
        }
    }
}

// Function to update display points and navigation step size
function updateDisplaySettings() {
    // Get values from inputs
    const displayPointsInput = document.getElementById('display-points');
    const stepSizeInput = document.getElementById('step-size');
    
    if (!displayPointsInput || !stepSizeInput) {
        console.error("Display settings inputs not found");
        return;
    }
    
    const displayPoints = parseInt(displayPointsInput.value);
    const stepSize = parseInt(stepSizeInput.value);
    
    // Validate inputs and apply constraints
    if (!isNaN(displayPoints) && displayPoints > 0) {
        // Ensure reasonable limits
        MAX_DISPLAY_POINTS = Math.min(Math.max(displayPoints, 10), 1000);
        displayPointsInput.value = MAX_DISPLAY_POINTS; // Update input to reflect constrained value
    }
    
    if (!isNaN(stepSize) && stepSize > 0) {
        // Ensure reasonable limits
        NAVIGATION_STEP_SIZE = Math.min(Math.max(stepSize, 1), 500);
        stepSizeInput.value = NAVIGATION_STEP_SIZE; // Update input to reflect constrained value
        
        // Update button text to reflect new step size
        if (scrollLeftBtn) {
            scrollLeftBtn.textContent = `← Previous (${NAVIGATION_STEP_SIZE})`;
            scrollLeftBtn.title = `Move back ${NAVIGATION_STEP_SIZE} data points`;
        }
        
        if (scrollRightBtn) {
            scrollRightBtn.textContent = `Next (${NAVIGATION_STEP_SIZE}) →`;
            scrollRightBtn.title = `Move forward ${NAVIGATION_STEP_SIZE} data points`;
        }
    }
    
    // If chart exists, update the data window
    if (chartInstance && fullDataset.labels.length > 0) {
        // Reset current position to avoid being out of bounds
        const maxStart = Math.max(0, fullDataset.labels.length - MAX_DISPLAY_POINTS);
        currentDataStart = Math.min(currentDataStart, maxStart);
        
        // Update the chart
        updateChartDataWindow();
        
        // Update display settings message in the chart title
        if (chartInstance.options.plugins.title.originalText) {
            chartInstance.options.plugins.title.text = 
                `${chartInstance.options.plugins.title.originalText} (Showing ${MAX_DISPLAY_POINTS} points)`;
            chartInstance.update();
        }
    }
    
    console.log(`Display settings updated: ${MAX_DISPLAY_POINTS} points, step size ${NAVIGATION_STEP_SIZE}`);
}

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
    
    // Use configured navigation step size
    currentDataStart = Math.max(0, currentDataStart - NAVIGATION_STEP_SIZE);
    updateChartDataWindow();
}

// Function to handle scrolling right (next data)
function scrollRight() {
    if (!fullDataset.labels.length || !chartInstance) return;
    
    // Use configured navigation step size
    const maxStart = Math.max(0, fullDataset.labels.length - MAX_DISPLAY_POINTS);
    currentDataStart = Math.min(maxStart, currentDataStart + NAVIGATION_STEP_SIZE);
    updateChartDataWindow();
}

// Function to handle scrolling on the graph
function handleGraphScroll(event) {
    if (!fullDataset.labels.length || !chartInstance) return;
    
    event.preventDefault();
    
    // Determine scroll direction
    const scrollDirection = Math.sign(event.deltaY);
    const dataLength = fullDataset.labels.length;
    
    // Use smaller steps for mouse wheel scrolling
    const wheelScrollSpeed = Math.max(1, Math.floor(NAVIGATION_STEP_SIZE / 2));
    
    if (scrollDirection > 0) {
        // Scroll right/forward
        if (currentDataStart + MAX_DISPLAY_POINTS < dataLength) {
            currentDataStart += wheelScrollSpeed;
        }
    } else {
        // Scroll left/backward
        currentDataStart = Math.max(0, currentDataStart - wheelScrollSpeed);
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
    
    // Determine if the range spans across zero (for diverging palette)
    const spanZero = minVal < 0 && maxVal > 0;
    
    // Debug info
    let negCount = 0;
    let posCount = 0;
    let zeroCount = 0;
    
    // Create a new dataset with individual point colors
    for (let i = 0; i < yValues.length; i++) {
        const yVal = yValues[i];
        const colorVal = colorValues[i] !== undefined ? colorValues[i] : 0;
        const xVal = xValues && xValues.length > i ? xValues[i] : i;
        const label = labels && i < labels.length ? labels[i] : '';
        
        // Count values for debugging
        if (colorVal < 0) negCount++;
        else if (colorVal > 0) posCount++;
        else zeroCount++;
        
        // Normalize the color value between min and max
        let normalizedVal;
        
        if (spanZero) {
            // For ranges that cross zero, use diverging palette
            if (colorVal < 0) {
                // Negative values should be normalized within their own range
                normalizedVal = colorVal / Math.min(-0.00001, minVal);
                // Ensure the values are in -1 to 0 range, with -1 being the most negative
                normalizedVal = Math.max(-1, Math.min(0, normalizedVal));
            } else {
                // Positive values should be normalized within their own range
                normalizedVal = colorVal / Math.max(0.00001, maxVal);
                // Ensure the values are in 0 to 1 range, with 1 being the most positive
                normalizedVal = Math.max(0, Math.min(1, normalizedVal));
            }
        } else {
            // For ranges that don't cross zero, use sequential palette
            normalizedVal = (colorVal - minVal) / (maxVal - minVal);
            normalizedVal = Math.max(0, Math.min(1, normalizedVal));
        }
        
        let pointColor;
        
        // Check if value exceeds normalization range
        const beyondRange = (colorMinValue !== null && colorVal < colorMinValue) || 
                           (colorMaxValue !== null && colorVal > colorMaxValue);
        
        // Add a flag to track values near zero for special coloring
        const nearZero = Math.abs(colorVal) < Math.max(Math.abs(minVal), Math.abs(maxVal)) * 0.1;
        
        if (spanZero) {
            // Create a diverging palette (blue → gray → red)
            if (colorVal < 0) {
                if (nearZero) {
                    // Values close to zero get a very light blue with gray tint
                    const intensity = Math.abs(normalizedVal) * 0.5; // Reduced intensity for near-zero
                    pointColor = `rgba(200, 200, 230, ${0.7 + intensity * 0.3})`; // Light blue-gray
                } else if (beyondRange) {
                    // Values beyond normalization range get darker, more saturated blue
                    pointColor = `rgba(0, 0, 100, 0.9)`; // Dark blue
                } else {
                    // Normal negative values - blue with intensity based on value
                    const intensity = Math.abs(normalizedVal);
                    // Use a formula that creates stronger blue for values farther from zero
                    const blueIntensity = 150 + Math.round(105 * intensity);
                    pointColor = `rgba(0, 0, ${blueIntensity}, ${0.6 + intensity * 0.4})`; 
                }
            } else if (colorVal > 0) {
                if (nearZero) {
                    // Values close to zero get a very light red with gray tint
                    const intensity = normalizedVal * 0.5; // Reduced intensity for near-zero
                    pointColor = `rgba(230, 200, 200, ${0.7 + intensity * 0.3})`; // Light red-gray
                } else if (beyondRange) {
                    // Values beyond normalization range get darker, more saturated red
                    pointColor = `rgba(100, 0, 0, 0.9)`; // Dark red
                } else {
                    // Normal positive values - red with intensity based on value
                    const intensity = normalizedVal;
                    // Use a formula that creates stronger red for values farther from zero
                    const redIntensity = 150 + Math.round(105 * intensity);
                    pointColor = `rgba(${redIntensity}, 0, 0, ${0.6 + intensity * 0.4})`;
                }
            } else {
                // Neutral gray for zero
                pointColor = 'rgba(200, 200, 200, 0.8)';
            }
        } else if (minVal < 0 && maxVal < 0) {
            // All negative values - blue palette
            if (beyondRange) {
                // Values beyond range get darker blue
                pointColor = `rgba(0, 0, 100, 0.9)`;
            } else {
                // For all-negative data, intensity increases with absolute value
                const intensity = 1 - normalizedVal; // invert so 0 = lightest, 1 = darkest
                pointColor = `rgba(0, 0, ${Math.round(150 + 105 * intensity)}, ${0.6 + intensity * 0.4})`;
            }
        } else if (minVal >= 0 && maxVal > 0) {
            // All positive values - red palette
            if (beyondRange) {
                // Values beyond range get darker red
                pointColor = `rgba(100, 0, 0, 0.9)`;
            } else {
                // For all-positive data, intensity increases with value
                const intensity = normalizedVal;
                pointColor = `rgba(${Math.round(150 + 105 * intensity)}, 0, 0, ${0.6 + intensity * 0.4})`;
            }
        } else {
            // Use viridis-like palette (continuous from cool to warm)
            // This creates a smooth color gradient like in Seaborn
            const h = (1 - normalizedVal) * 240; // Hue: 240 (blue) to 0 (red)
            const s = 0.8; // Saturation: 80%
            const l = 0.5; // Lightness: 50%
            
            // Convert HSL to RGB (simplified conversion)
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c/2;
            
            let r, g, b;
            if (h < 60) {
                [r, g, b] = [c, x, 0];
            } else if (h < 120) {
                [r, g, b] = [x, c, 0];
            } else if (h < 180) {
                [r, g, b] = [0, c, x];
            } else if (h < 240) {
                [r, g, b] = [0, x, c];
            } else if (h < 300) {
                [r, g, b] = [x, 0, c];
            } else {
                [r, g, b] = [c, 0, x];
            }
            
            pointColor = `rgba(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}, 0.8)`;
        }
        
        // Add to our data arrays
        scatterData.push({
            x: xVal,
            y: yVal,
            originalLabel: label,
            colorValue: colorVal,
            normalizedValue: normalizedVal,
            beyondRange: beyondRange,
            nearZero: nearZero
        });
        
        pointColors.push(pointColor);
    }
    
    // Debug info
    console.log(`Color distribution: ${negCount} negative, ${posCount} positive, ${zeroCount} zero`);
    console.log("Sample colors generated:", pointColors.slice(0, 5));
    
    // Update the chart's dataset
    if (chart.data.datasets.length > 0) {
        // Update the existing dataset
        chart.data.datasets[0].data = scatterData;
        
        // Set point colors individually - important for Chart.js to render correctly
        chart.data.datasets[0].backgroundColor = pointColors;
        chart.data.datasets[0].borderColor = pointColors;
        
        // Increase point size for better visibility
        chart.data.datasets[0].pointRadius = graphTypeSelect.value === 'bubble' ? 6 : 4;
        chart.data.datasets[0].pointHoverRadius = graphTypeSelect.value === 'bubble' ? 8 : 6;
    }
    
    // Update or create the color legend to match the updated color scheme
    updateSeabornStyleLegend(minVal, maxVal, spanZero);
    
    // Update tooltip callbacks to show color-coded values
    chart.options.plugins.tooltip.callbacks.label = function(context) {
        const point = context.raw;
        const colorVal = point.colorValue;
        const beyondRange = point.beyondRange;
        const formattedColorVal = colorVal !== undefined ? colorVal.toFixed(2) : 'N/A';
        
        let colorStyle = '';
        
        // Style text in tooltip to match point color (simplified for better readability)
        if (spanZero) {
            if (colorVal < 0) {
                // Blue for negative
                colorStyle = beyondRange ? 'color: rgb(0, 0, 120); font-weight: bold;' : 'color: blue;';
            } else if (colorVal > 0) {
                // Red for positive
                colorStyle = beyondRange ? 'color: rgb(120, 0, 0); font-weight: bold;' : 'color: red;';
            } else {
                colorStyle = 'color: gray;';
            }
        } else if (minVal < 0 && maxVal < 0) {
            // All negative - show blue text
            colorStyle = beyondRange ? 'color: rgb(0, 0, 120); font-weight: bold;' : 'color: blue;';
        } else if (minVal >= 0 && maxVal > 0) {
            // All positive - show red text
            colorStyle = beyondRange ? 'color: rgb(120, 0, 0); font-weight: bold;' : 'color: red;';
        } else {
            // Default colors
            if (colorVal < 0) {
                colorStyle = 'color: blue;';
            } else if (colorVal > 0) {
                colorStyle = 'color: red;';
            }
        }
        
        // Format tooltip with range information
        let valueDisplay = formattedColorVal;
        if (beyondRange) {
            valueDisplay += ' (beyond range)';
        }
        
        return [
            `X: ${point.originalLabel || point.x}`,
            `Y: ${point.y}`,
            `<span style="${colorStyle}">Value: ${valueDisplay}</span>`
        ];
    };
    
    // Make sure tooltips use HTML (same as before)
    chart.options.plugins.tooltip.enabled = false;
    chart.options.plugins.tooltip.external = function(context) {
        // External tooltip implementation (unchanged)
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

// Function to create Seaborn-style color legend
function updateSeabornStyleLegend(minVal, maxVal, spanZero) {
    // Clean up any existing legend
    cleanupColorLegend();
    
    // Create new legend container
    const legendContainer = document.createElement('div');
    legendContainer.className = 'color-gradient-legend';
    legendContainer.style.position = 'absolute';
    legendContainer.style.right = '10px';
    legendContainer.style.top = '50px';
    legendContainer.style.width = '30px';
    legendContainer.style.height = '200px';
    legendContainer.style.borderRadius = '4px';
    legendContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
    legendContainer.style.zIndex = '10';
    
    // Create the gradient based on the data range
    if (spanZero) {
        // Diverging palette for data crossing zero
        legendContainer.style.background = 'linear-gradient(to top, #000080, blue, #9090ff, #e0e0e0, #ff9090, red, #800000)';
    } else if (minVal < 0 && maxVal < 0) {
        // All negative values - blue palette (dark to light)
        legendContainer.style.background = 'linear-gradient(to top, #000080, darkblue, blue, #9090ff)';
    } else if (minVal >= 0 && maxVal > 0) {
        // All positive values - red palette (light to dark)
        legendContainer.style.background = 'linear-gradient(to top, #ff9090, red, darkred, #800000)';
    } else {
        // Viridis-like palette for mixed data not crossing zero
        legendContainer.style.background = 'linear-gradient(to top, #000080, blue, cyan, green, yellow, red, #800000)';
    }
    
    // Add scale values
    const minLabel = document.createElement('div');
    minLabel.style.position = 'absolute';
    minLabel.style.bottom = '0';
    minLabel.style.right = '35px';
    minLabel.style.fontSize = '12px';
    minLabel.textContent = minVal.toFixed(1);
    
    const maxLabel = document.createElement('div');
    maxLabel.style.position = 'absolute';
    maxLabel.style.top = '0';
    maxLabel.style.right = '35px';
    maxLabel.style.fontSize = '12px';
    maxLabel.textContent = maxVal.toFixed(1);
    
    legendContainer.appendChild(minLabel);
    legendContainer.appendChild(maxLabel);
    
    // Add zero marker if range spans zero
    if (spanZero) {
        const zeroLabel = document.createElement('div');
        zeroLabel.style.position = 'absolute';
        zeroLabel.style.top = '50%';
        zeroLabel.style.right = '35px';
        zeroLabel.style.fontSize = '12px';
        zeroLabel.style.transform = 'translateY(-50%)';
        zeroLabel.textContent = '0';
        legendContainer.appendChild(zeroLabel);
        
        // Add divider line at zero
        const divider = document.createElement('div');
        divider.style.position = 'absolute';
        divider.style.top = '50%';
        divider.style.left = '0';
        divider.style.right = '0';
        divider.style.height = '1px';
        divider.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        legendContainer.appendChild(divider);
        
        // Add near-zero markers to show the transition points
        const nearZeroThreshold = Math.max(Math.abs(minVal), Math.abs(maxVal)) * 0.1;
        
        if (nearZeroThreshold > 0) {
            // Negative near-zero marker
            const negNearZeroLabel = document.createElement('div');
            negNearZeroLabel.style.position = 'absolute';
            negNearZeroLabel.style.top = '42%';
            negNearZeroLabel.style.right = '35px';
            negNearZeroLabel.style.fontSize = '10px';
            negNearZeroLabel.style.color = '#666';
            negNearZeroLabel.textContent = (-nearZeroThreshold).toFixed(1);
            legendContainer.appendChild(negNearZeroLabel);
            
            // Positive near-zero marker
            const posNearZeroLabel = document.createElement('div');
            posNearZeroLabel.style.position = 'absolute';
            posNearZeroLabel.style.top = '58%';
            posNearZeroLabel.style.right = '35px';
            posNearZeroLabel.style.fontSize = '10px';
            posNearZeroLabel.style.color = '#666';
            posNearZeroLabel.textContent = nearZeroThreshold.toFixed(1);
            legendContainer.appendChild(posNearZeroLabel);
        }
    }
    
    // Add colorMin and colorMax markers if explicitly set
    if (colorMinValue !== null || colorMaxValue !== null) {
        const legendHeight = 200; // Height of the color gradient
        
        if (colorMinValue !== null && colorMinValue > minVal) {
            // Calculate position based on value's place in the range
            let position;
            if (spanZero) {
                // For diverging scale, position depends on which side of zero we're on
                if (colorMinValue < 0) {
                    // Negative side - should be between bottom and middle
                    position = 50 - (50 * colorMinValue / minVal);
                } else {
                    // Positive side - should be between middle and top
                    position = 50 + (50 * colorMinValue / maxVal);
                }
            } else {
                // Linear scale
                position = 100 * (colorMinValue - minVal) / (maxVal - minVal);
            }
            
            // Create marker
            const minMarker = document.createElement('div');
            minMarker.style.position = 'absolute';
            minMarker.style.bottom = `${position}%`;
            minMarker.style.left = '-5px';
            minMarker.style.width = '40px';
            minMarker.style.height = '1px';
            minMarker.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            
            const minMarkerLabel = document.createElement('div');
            minMarkerLabel.style.position = 'absolute';
            minMarkerLabel.style.right = '45px';
            minMarkerLabel.style.bottom = `${position}%`;
            minMarkerLabel.style.fontSize = '10px';
            minMarkerLabel.style.transform = 'translateY(50%)';
            minMarkerLabel.textContent = `Min: ${colorMinValue}`;
            minMarkerLabel.style.fontWeight = 'bold';
            
            legendContainer.appendChild(minMarker);
            legendContainer.appendChild(minMarkerLabel);
        }
        
        if (colorMaxValue !== null && colorMaxValue < maxVal) {
            // Calculate position
            let position;
            if (spanZero) {
                // For diverging scale, position depends on which side of zero we're on
                if (colorMaxValue < 0) {
                    // Negative side - should be between bottom and middle
                    position = 50 - (50 * colorMaxValue / minVal);
                } else {
                    // Positive side - should be between middle and top
                    position = 50 + (50 * colorMaxValue / maxVal);
                }
            } else {
                // Linear scale
                position = 100 * (colorMaxValue - minVal) / (maxVal - minVal);
            }
            
            // Create marker
            const maxMarker = document.createElement('div');
            maxMarker.style.position = 'absolute';
            maxMarker.style.bottom = `${position}%`;
            maxMarker.style.left = '-5px';
            maxMarker.style.width = '40px';
            maxMarker.style.height = '1px';
            maxMarker.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            
            const maxMarkerLabel = document.createElement('div');
            maxMarkerLabel.style.position = 'absolute';
            maxMarkerLabel.style.right = '45px';
            maxMarkerLabel.style.bottom = `${position}%`;
            maxMarkerLabel.style.fontSize = '10px';
            maxMarkerLabel.style.transform = 'translateY(50%)';
            maxMarkerLabel.textContent = `Max: ${colorMaxValue}`;
            maxMarkerLabel.style.fontWeight = 'bold';
            
            legendContainer.appendChild(maxMarker);
            legendContainer.appendChild(maxMarkerLabel);
        }
    }
    
    // Add to the container
    graphContainer.appendChild(legendContainer);
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
        dataPositionSpan.textContent = `${start + 1} - ${end} of ${total} (Step: ${NAVIGATION_STEP_SIZE})`;
    }
    
    // Update chart title to show position and settings
    if (chartInstance && chartInstance.options.plugins.title.originalText) {
        const scrollPercent = Math.round((start / Math.max(1, total - MAX_DISPLAY_POINTS)) * 100);
        chartInstance.options.plugins.title.text = 
            `${chartInstance.options.plugins.title.originalText} (${MAX_DISPLAY_POINTS} points, position: ${scrollPercent}%)`;
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
        
        // Update display settings from input fields if they exist
        if (document.getElementById('display-points') && document.getElementById('step-size')) {
            updateDisplaySettings();
        }
        
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
        console.log("Display settings:", MAX_DISPLAY_POINTS, "points, step size", NAVIGATION_STEP_SIZE);
        
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
                
                // Update data controls to show new step size
                enhanceDataControls(dataControls);
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
            text: `Showing ${currentDataStart+1}-${Math.min(currentDataStart+MAX_DISPLAY_POINTS, fullDataset.labels.length)} of ${fullDataset.labels.length} data points (Step: ${NAVIGATION_STEP_SIZE})`,
            padding: {
                bottom: 10
            }
        };
    }
    
    return config;
}

// Update destroy chart instance to clean up color legend
const originalDestroyFunction = Chart.prototype.destroy;
Chart.prototype.destroy = function() {
    cleanupColorLegend();
    return originalDestroyFunction.apply(this, arguments);
}; 