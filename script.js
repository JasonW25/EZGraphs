// Function to get the current width of the plot container
function getPlotWidth() {
    const plotContainer = document.getElementById('plot');
    return plotContainer.clientWidth - 100; // Subtract margins
}

// Constants for visualization
const margin = { top: 40, right: 40, bottom: 60, left: 60 };
let width = getPlotWidth() - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#plot")
    .append("svg")
    .attr("width", "100%")
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// Global variables for data management
let fullData = [];
let currentStartIndex = 0;
let isFullscreen = false;
let mergeDataCache = null; // Cache for parsed merge file data

// Handle window resize
window.addEventListener('resize', () => {
    width = getPlotWidth() - margin.left - margin.right;
    if (fullData.length > 0) {
        updateVisualization();
    }
});

// Fullscreen toggle
document.getElementById('fullscreen-btn').addEventListener('click', function() {
    const plotContainer = document.getElementById('plot');
    isFullscreen = true;
    
    plotContainer.classList.add('fullscreen');
    this.style.display = 'none';
    document.getElementById('exit-fullscreen').style.display = 'block';
    document.querySelector('.navigation').style.display = 'none';
    document.querySelector('.fullscreen-navigation').style.display = 'block';
    
    // Update fullscreen data position display
    updateFullscreenPositionText();
    
    // Wait for transition to complete
    setTimeout(() => {
        width = getPlotWidth() - margin.left - margin.right;
        if (fullData.length > 0) {
            updateVisualization();
        }
    }, 300);
});

// Exit fullscreen button
document.getElementById('exit-fullscreen').addEventListener('click', function() {
    const plotContainer = document.getElementById('plot');
    isFullscreen = false;
    
    plotContainer.classList.remove('fullscreen');
    this.style.display = 'none';
    document.getElementById('fullscreen-btn').style.display = 'block';
    document.querySelector('.navigation').style.display = 'block';
    document.querySelector('.fullscreen-navigation').style.display = 'none';
    
    // Wait for transition to complete
    setTimeout(() => {
        width = getPlotWidth() - margin.left - margin.right;
        if (fullData.length > 0) {
            updateVisualization();
        }
    }, 300);
});

// Function to update the fullscreen position text
function updateFullscreenPositionText() {
    if (!fullData.length) return;
    
    const displayPoints = +d3.select("#display-points").property("value");
    const end = Math.min(currentStartIndex + displayPoints, fullData.length);
    const positionText = `${currentStartIndex + 1} - ${end} of ${fullData.length}`;
    
    d3.select("#fullscreen-data-position").text(positionText);
}

// Function to parse data types (numbers and dates)
function parseDataTypes(data) {
    // Define parsers for both date-time and date-only formats
    const parseDateTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const parseDate = d3.timeParse("%Y-%m-%d"); 

    data.forEach(d => {
        Object.keys(d).forEach(key => {
            const value = d[key]; // Original value
            if (value === null || value === undefined) return; // Skip null/undefined

            // Try parsing as date-time first, then date-only
            if (typeof value === 'string') {
                let parsedValue = parseDateTime(value);
                if (parsedValue !== null) {
                    d[key] = parsedValue; // Assign if date-time parse successful
                }
                else {
                    parsedValue = parseDate(value);
                    if (parsedValue !== null) {
                        d[key] = parsedValue; // Assign if date-only parse successful
                    }
                    // If neither date format parses, try parsing as a number
                    else if (!isNaN(value) && value.trim() !== '') {
                        d[key] = +value;
                    }
                    // Otherwise, leave as string
                }
            } 
            // If it's already a number (e.g., from CSV parser), keep it
            else if (typeof value === 'number') {
                 // Potentially handle existing numbers if needed, but usually okay
            }
        });
    });
    return data;
}
    
// Function to populate dropdown menus
function populateDropdowns(columns) {
    ['x-axis-select', 'y-axis-select', 'color-column-select'].forEach(id => {
        const select = d3.select(`#${id}`);
        const currentValue = select.property('value'); // Remember current selection
        select.selectAll('option').remove();
        select.append('option').text(id === 'color-column-select' ? 'Select Color Column (Optional)' : 'Select Column').attr('value', '');
        columns.forEach(column => {
            select.append('option').text(column).attr('value', column);
        });
        // Restore selection if the column still exists
        if (columns.includes(currentValue)) {
             select.property('value', currentValue);
        }
    });
}

// Function to update UI elements after data is loaded or modified
function updateUIAfterDataChange() {
    d3.select('#main-controls').style('display', 'block');
    d3.select('.navigation').style('display', 'block');
    document.getElementById('fullscreen-btn').style.display = 'block';
    // Show merge input section only if primary data is loaded
    d3.select('#merge-input').style('display', 'block'); 
    updatePositionText(); // Update position text immediately
    
    // Also update fullscreen position text if in fullscreen mode
    if (isFullscreen) {
        updateFullscreenPositionText();
    }
}

// Function to process and visualize the primary data
function processPrimaryData(data) {
    fullData = parseDataTypes(data);
    const columns = Object.keys(fullData[0] || {});
    populateDropdowns(columns);
    updateUIAfterDataChange();
    // Clear merge cache and hide selection UI when a new primary file is loaded
    mergeDataCache = null;
    d3.select('#merge-column-selection').style('display', 'none');
    d3.select('#merge-options-container').html(null);
    d3.select("#merge-status").text("");
    d3.select("#confirm-merge-status").text("");
    d3.select("#merge-csv-file").property('value', ''); // Reset merge file input
    // Initial visualization update if axes are selected
    window.updateVisualization(); 
}

    // Function to update data window position text
    function updatePositionText() {
    if (!fullData.length) return;
        const displayPoints = +d3.select("#display-points").property("value");
        const end = Math.min(currentStartIndex + displayPoints, fullData.length);
        const positionText = `${currentStartIndex + 1} - ${end} of ${fullData.length}`;
        
        d3.select("#data-position").text(positionText);
        
        // Also update fullscreen position text if in fullscreen mode
        if (isFullscreen) {
        updateFullscreenPositionText(); // Reuse the specific function
        }
    }
    
// Make updatePositionText accessible globally if needed elsewhere (check usage)
// window.updatePositionText = updatePositionText; // Keep if needed by other parts, remove if not

    // Declare updateVisualization in global scope so we can call it from window resize
    window.updateVisualization = function() {
        const xColumn = d3.select("#x-axis-select").property("value");
        const yColumn = d3.select("#y-axis-select").property("value");
        const colorColumn = d3.select("#color-column-select").property("value");
        const displayPoints = +d3.select("#display-points").property("value");
        let colorIntensityPoint = +d3.select("#color-intensity-input").property("value");
        let yGridInterval = +d3.select("#y-grid-interval").property("value");

        // Validate color intensity point (must be positive)
        if (isNaN(colorIntensityPoint) || colorIntensityPoint <= 0) {
            colorIntensityPoint = 1; // Default to 1 if invalid
            d3.select("#color-intensity-input").property("value", 1); // Correct the input field
        }

        // Validate grid interval (must be positive)
        if (isNaN(yGridInterval) || yGridInterval <= 0) {
            yGridInterval = 10; // Default if invalid
            d3.select("#y-grid-interval").property("value", yGridInterval);
        }

    // Check if essential columns are selected or if there's no data
    if (!xColumn || !yColumn || !fullData.length) {
        svg.selectAll("*").remove(); // Clear plot
        // Update position text even if plot is cleared
        updatePositionText(); 
        return;
    }

        // Update width based on current container size
        width = getPlotWidth() - margin.left - margin.right;

    // Get visible data window *after* basic checks pass
        const visibleData = fullData.slice(currentStartIndex, currentStartIndex + displayPoints);

    // Check if the slice actually contains data
    if (!visibleData.length) {
        svg.selectAll("*").remove(); // Clear plot if no visible data
        updatePositionText(); // Also update position text here
        return;
    }

    // Clear previous elements (only if we have data to plot)
        svg.selectAll("*").remove();

        // Determine if X column is Date type
        const isXDate = visibleData.length > 0 && visibleData[0][xColumn] instanceof Date;

        // Create scales
        let xScale;
        let uniqueDates = []; // Declare uniqueDates here

        if (isXDate) {
            // Use scalePoint for Date axes to skip gaps
            uniqueDates = [...new Set(visibleData.map(d => d[xColumn].getTime()))] // Assign value here
                                .map(time => new Date(time)) 
                                .sort((a, b) => a - b); 
            
            xScale = d3.scalePoint()
                .domain(uniqueDates) 
                .range([0, width])
                .padding(0.5); 
        } else {
            // Use scaleLinear for numerical axes
            xScale = d3.scaleLinear()
                .domain(d3.extent(visibleData, d => d[xColumn]))
                .range([0, width]);
        }
        
        const yScale = d3.scaleLinear()
            .domain(d3.extent(visibleData, d => d[yColumn]))
            .range([height, 0]);

        // Create color scale dynamically based on input
        const colorScale = d3.scaleLinear()
            .domain([-colorIntensityPoint, 0, colorIntensityPoint]) // Use dynamic intensity point
            .range(["blue", "#b0b0b0", "red"]);

        // -- Add Horizontal Grid Lines --
        const yDomain = yScale.domain();
        const yMin = Math.floor(yDomain[0] / yGridInterval) * yGridInterval;
        const yMax = Math.ceil(yDomain[1] / yGridInterval) * yGridInterval;
        const yTickValues = d3.range(yMin, yMax + yGridInterval, yGridInterval);

        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .tickValues(yTickValues)
                .tickSize(-width) // Lines span the width
                .tickFormat("") // No labels on grid lines
            )
            .selectAll(".tick line") // Style the grid lines
                .attr("stroke", "#cccccc") // Darker grey for grid
                .attr("stroke-opacity", 0.7);
        // -------------------------------

        // Add axes
        const xAxis = d3.axisBottom(xScale);

        if (isXDate) {
            // Customize ticks for Date scalePoint axis
            // Now uniqueDates should be accessible here
            const numTicks = Math.min(uniqueDates.length, Math.floor(width / 80)); 
            const tickValues = uniqueDates.length > numTicks 
                ? uniqueDates.filter((d, i) => i % Math.ceil(uniqueDates.length / numTicks) === 0) 
                : uniqueDates; 
            
            xAxis.tickValues(tickValues)
                 .tickFormat(d3.timeFormat("%Y-%m-%d %H:%M"));
        }
        
        // Append X axis group first
        const xAxisGroup = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);

        // Select ticks within the group for styling IF they exist
        xAxisGroup.selectAll(".tick text") // More specific selector for tick labels
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)"); 
        
        // Append the X axis label to the axis group
        xAxisGroup.append("text") 
            .attr("x", width / 2)
            .attr("y", 50) // Adjust position due to potentially rotated ticks
            .attr("fill", "black")
            .style("text-anchor", "middle")
            // .attr("transform", null) // This is likely not needed here
            .text(xColumn);

        // Append Y axis group and label
        svg.append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text(yColumn);

        // Add dots
        svg.selectAll("circle")
            .data(visibleData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d[xColumn]))
            .attr("cy", d => yScale(d[yColumn]))
            .attr("r", 5)
            .attr("fill", d => {
                if (colorColumn && !isNaN(d[colorColumn])) {
                    const value = d[colorColumn];
                    // Clamp the value to the dynamic domain before scaling
                    const clampedValue = Math.max(-colorIntensityPoint, Math.min(colorIntensityPoint, value)); 
                    return colorScale(clampedValue);
                }
                return "steelblue"; // Default color if no color column or non-numeric
            })
            .attr("opacity", 0.7)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("r", 8)
                    .attr("opacity", 1);
                
                tooltip.style("opacity", 1)
                    .html(`${xColumn}: ${d[xColumn]}<br/>${yColumn}: ${d[yColumn]}${colorColumn ? `<br/>${colorColumn}: ${d[colorColumn]}` : ""}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("r", 5)
                    .attr("opacity", 0.7);
                
                tooltip.style("opacity", 0);
            });

    updatePositionText(); // Ensure position text is updated
};

// Event listener for primary file input
d3.select("#csv-file").on("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const data = d3.csvParse(text);
            currentStartIndex = 0; // Reset index on new file load
            processPrimaryData(data);
            // Clear any previous merge status
            d3.select("#merge-status").text(""); 
            // Reset merge file input value if needed
            d3.select("#merge-csv-file").property('value', ''); 
        };
        reader.readAsText(file);
    }
});

// Event listener for loading the merge file (Step 1)
d3.select("#load-merge-file-btn").on("click", function() {
    const mergeFileInput = document.getElementById('merge-csv-file');
    const mergeFile = mergeFileInput.files[0];
    const mergeStatus = d3.select("#merge-status");
    const columnSelectionDiv = d3.select('#merge-column-selection');
    const optionsContainer = d3.select('#merge-options-container');
    const confirmStatus = d3.select("#confirm-merge-status");

    // Clear previous states
    mergeStatus.text("");
    confirmStatus.text("");
    optionsContainer.html(null); // Clear old options
    columnSelectionDiv.style('display', 'none');
    mergeDataCache = null;

    if (!fullData.length) {
        mergeStatus.text("Load the primary CSV file first.");
        return;
    }

    if (mergeFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            let tempData;
            try {
                tempData = d3.csvParse(text);
                if (!tempData || tempData.length === 0) throw new Error("CSV is empty or invalid.");
                tempData = parseDataTypes(tempData); // Parse types for merge data
            } catch (error) {
                 mergeStatus.text(`Error parsing merge CSV: ${error.message}`);
                 return;
            }

            if (tempData.length !== fullData.length) {
                mergeStatus.text(`Row count mismatch: Primary (${fullData.length}) vs Merge (${tempData.length}). Cannot merge.`);
                return;
            }

            // Store parsed data in cache
            mergeDataCache = tempData;
            const mergeColumns = Object.keys(mergeDataCache[0] || {});

            if (mergeColumns.length === 0) {
                mergeStatus.text("Merge file has no columns.");
                mergeDataCache = null;
                return;
            }

            // Build the column selection UI
            mergeColumns.forEach(col => {
                const controlGroup = optionsContainer.append('div').attr('class', 'control-group');
                
                controlGroup.append('input')
                    .attr('type', 'checkbox')
                    .attr('id', `merge-col-cb-${col}`)
                    .attr('value', col)
                    .property('checked', true); // Check by default
                
                controlGroup.append('label')
                    .attr('for', `merge-col-cb-${col}`)
                    .text(` ${col} `) // Add spacing around label
                    .style('margin-right', '10px')
                    .style('width', 'auto'); // Override default label width
                
                controlGroup.append('input')
                    .attr('type', 'text')
                    .attr('id', `merge-col-rename-${col}`)
                    .attr('data-original-column', col) // Link to original name
                    .attr('placeholder', 'New name (optional)')
                    .style('width', '200px'); // Adjust width as needed
            });

            mergeStatus.text("Merge file loaded. Select columns and confirm."); // Inform user
            columnSelectionDiv.style('display', 'block'); // Show the selection UI

        };
        reader.onerror = function() {
            mergeStatus.text("Error reading merge file.");
        };
        mergeStatus.text("Processing merge file..."); // Indicate processing
        reader.readAsText(mergeFile);
    } else {
        mergeStatus.text("Select a CSV file to merge.");
    }
});

// Event listener for confirming the merge (Step 2)
d3.select("#confirm-merge-btn").on("click", function() {
    const optionsContainer = d3.select('#merge-options-container');
    const confirmStatus = d3.select("#confirm-merge-status");
    const mergeStatus = d3.select("#merge-status"); // To show final success
    const checkboxes = optionsContainer.selectAll('input[type="checkbox"]');
    
    confirmStatus.text(""); // Clear previous status

    if (!mergeDataCache) {
        confirmStatus.text("Error: No merge data loaded. Please load merge file again.");
        return;
    }

    let columnsToMerge = {};
    let hasError = false;
    const currentPrimaryColumns = Object.keys(fullData[0] || {});

    checkboxes.each(function() {
        const checkbox = d3.select(this);
        if (checkbox.property('checked')) {
            const originalCol = checkbox.property('value');
            const renameInput = optionsContainer.select(`#merge-col-rename-${originalCol}`);
            let newName = renameInput.property('value').trim();
            
            if (!newName) {
                newName = originalCol; // Use original if rename is empty
            }

            // Validation: Check if new name conflicts with *existing* primary columns
            if (currentPrimaryColumns.includes(newName)) {
                 confirmStatus.text(`Error: Column name "${newName}" already exists in primary data. Choose a different name.`);
                 hasError = true;
                 return; // Stop .each loop early if possible (though it might not fully stop)
            }
            
            // Validation: Check if the *new* name conflicts with other *new* names being added in this batch
            if (Object.values(columnsToMerge).includes(newName)){
                confirmStatus.text(`Error: You are trying to rename multiple columns to "${newName}". Choose unique names.`);
                hasError = true;
                return;
            }

            columnsToMerge[originalCol] = newName;
        }
    });

    if (hasError) {
        return; // Stop if validation failed
    }

    if (Object.keys(columnsToMerge).length === 0) {
        confirmStatus.text("No columns selected to merge.");
        return;
    }

    // Perform the actual merge
    fullData = fullData.map((primaryRow, index) => {
        const mergeRow = mergeDataCache[index];
        for (const [originalName, newName] of Object.entries(columnsToMerge)) {
            primaryRow[newName] = mergeRow[originalName];
        }
        return primaryRow;
    });

    // Update UI
    const combinedColumns = Object.keys(fullData[0] || {});
    populateDropdowns(combinedColumns);
    window.updateVisualization();

    // Cleanup
    mergeDataCache = null;
    d3.select('#merge-column-selection').style('display', 'none');
    optionsContainer.html(null);
    confirmStatus.text(""); 
    mergeStatus.text("Merge successful! Selected columns added.").style('color', 'green');
    d3.select("#merge-csv-file").property('value', ''); // Clear the file input

    // Clear success message after a few seconds
    setTimeout(() => {
        mergeStatus.text("").style('color', 'red'); // Reset color
    }, 5000);
});

// Initial setup: Hide controls and navigation until data is loaded
d3.select('#main-controls').style('display', 'none');
d3.select('.navigation').style('display', 'none');
document.getElementById('fullscreen-btn').style.display = 'none';
d3.select('#merge-input').style('display', 'none'); // Keep merge hidden initially
d3.select('#merge-column-selection').style('display', 'none'); // Also hide merge selection initially
d3.select('.fullscreen-navigation').style.display = 'none'; // Hide fullscreen nav initially

    // Navigation event handlers - regular mode
    d3.select("#prev-btn").on("click", () => {
        const displayPoints = +d3.select("#display-points").property("value");
        currentStartIndex = Math.max(0, currentStartIndex - displayPoints);
        updateVisualization();
    });

    d3.select("#next-btn").on("click", () => {
        const displayPoints = +d3.select("#display-points").property("value");
        if (currentStartIndex + displayPoints < fullData.length) {
            currentStartIndex += displayPoints;
            updateVisualization();
        }
    });
    
    // Navigation event handlers - fullscreen mode
    d3.select("#fullscreen-prev-btn").on("click", () => {
        const displayPoints = +d3.select("#display-points").property("value");
        currentStartIndex = Math.max(0, currentStartIndex - displayPoints);
        updateVisualization();
    });

    d3.select("#fullscreen-next-btn").on("click", () => {
        const displayPoints = +d3.select("#display-points").property("value");
        if (currentStartIndex + displayPoints < fullData.length) {
            currentStartIndex += displayPoints;
            updateVisualization();
        }
    });

    // Add event listeners to dropdowns and display points input
    d3.select("#x-axis-select").on("change", updateVisualization);
    d3.select("#y-axis-select").on("change", updateVisualization);
    d3.select("#color-column-select").on("change", updateVisualization);
    d3.select("#display-points").on("change", () => {
        currentStartIndex = 0;  // Reset to beginning when changing display points
        updateVisualization();
    });
    d3.select("#color-intensity-input").on("change", updateVisualization); // Add listener for intensity input 
    d3.select("#y-grid-interval").on("change", updateVisualization); // Add listener for grid interval 