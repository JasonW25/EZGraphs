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
    d3.select('.controls').style('display', 'block');
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

    // Create scales
    const xScale = (fullData[0][xColumn] instanceof Date) 
        ? d3.scaleTime()
        : d3.scaleLinear();
    
    xScale
        .domain(d3.extent(visibleData, d => d[xColumn]))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(visibleData, d => d[yColumn]))
        .range([height, 0]);

    // Create color scale
    const colorScale = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range(["blue", "gray", "red"]);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text(xColumn);

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
                const normalizedValue = Math.max(-1, Math.min(1, value));
                return colorScale(normalizedValue);
            }
            return "steelblue";
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

// Event listener for merge file input button
d3.select("#merge-btn").on("click", function() {
    const mergeFileInput = document.getElementById('merge-csv-file');
    const mergeFile = mergeFileInput.files[0];
    const mergeStatus = d3.select("#merge-status");

    if (!fullData.length) {
        mergeStatus.text("Load the primary CSV file first.");
        return;
    }

    if (mergeFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            let mergeData;
            try {
                mergeData = d3.csvParse(text);
                mergeData = parseDataTypes(mergeData); // Parse types for merge data
            } catch (error) {
                 mergeStatus.text(`Error parsing merge CSV: ${error.message}`);
                 return;
            }


            if (mergeData.length !== fullData.length) {
                mergeStatus.text(`Row count mismatch: Primary (${fullData.length}) vs Merge (${mergeData.length}).`);
                return;
            }

            // Merge columns
            const originalColumns = Object.keys(fullData[0] || {});
            const mergeColumns = Object.keys(mergeData[0] || {});
            
            fullData = fullData.map((primaryRow, index) => {
                const mergeRow = mergeData[index];
                mergeColumns.forEach(col => {
                    // Avoid overwriting existing columns from the primary file for now
                    // A more robust solution might involve prefixing or user choice
                    if (!originalColumns.includes(col)) { 
                        primaryRow[col] = mergeRow[col];
                    } else {
                        // Handle duplicate column names if necessary (e.g., prefix)
                        // For simplicity, we are currently skipping duplicates.
                        console.warn(`Skipping duplicate column from merge file: ${col}`);
                    }
                });
                return primaryRow;
            });

            // Update dropdowns with new combined columns
            const combinedColumns = Object.keys(fullData[0] || {});
            populateDropdowns(combinedColumns);

            mergeStatus.text("Merge successful! Columns added.").style('color', 'green');
            // Optionally hide merge section after successful merge
            // d3.select('#merge-input').style('display', 'none'); 
            
            // Clear the file input for merge
            mergeFileInput.value = ''; 

            // Update visualization if axes are selected
            window.updateVisualization(); 
            
            // Clear the success message after a few seconds
             setTimeout(() => {
                mergeStatus.text("").style('color', 'red'); // Reset color for potential errors
            }, 5000); 

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

// Initial setup: Hide controls and navigation until data is loaded
d3.select('.controls').style('display', 'none');
d3.select('.navigation').style('display', 'none');
document.getElementById('fullscreen-btn').style.display = 'none';
d3.select('#merge-input').style('display', 'none'); // Keep merge hidden initially
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