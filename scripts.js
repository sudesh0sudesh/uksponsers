// Modularize state management
const state = {
    currentPage: 1,
    currentSubPage: 1,
    pageSize: 100,
    allSponsorsData: [], // Master list of all sponsors
    sponsorsData: [],     // Currently displayed sponsors
    debounceTimeout: null,
};

// Refactored loadSponsors function
async function loadSponsors(page) {
    loadingIndicator.style.display = 'block';
    try {
        const response = await fetch(`sponsors_pages/sponsors_page_${page}.json`);
        const data = await response.json();
        state.allSponsorsData = state.allSponsorsData.concat(data); // Populate master list
        if (state.currentPage === 1) {
            state.sponsorsData = [...state.allSponsorsData]; // Initially display all sponsors only on first load
        }
        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('CORS error: Unable to fetch sponsors.json. Check CORS policy.');
        } else {
            console.error('Error loading sponsors:', error);
        }
        return [];
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Refactored displaySponsorsPage function
function displaySponsorsPage(subPage) {
    const tbody = document.getElementById('sponsorsBody');
    tbody.innerHTML = '';

    const start = (subPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageSponsors = state.sponsorsData.slice(start, end);

    pageSponsors.forEach(sponsor => {
        const row = tbody.insertRow();
        row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
        
        const cells = [
            { label: 'Organisation Name', value: sponsor.organisation_name || '' },
            { label: 'Town/City', value: sponsor.town_city || '' },
            { label: 'County', value: sponsor.county || '' },
            { label: 'Type & Rating', value: sponsor.type_rating || '' },
            { label: 'Route', value: sponsor.route || '' }
        ];

        cells.forEach((cellData, index) => {
            const cell = row.insertCell();
            cell.className = 'px-6 py-4';
            cell.setAttribute('data-label', cellData.label);
            if (index === 0 && cellData.value) { // If first cell and has text
                const link = document.createElement('a');
                link.href = `https://www.google.com/search?q=${encodeURIComponent(cellData.value)}`;
                link.textContent = cellData.value;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.classList.add('text-blue-600', 'hover:underline'); // Add styles for links
                cell.appendChild(link);
                console.log('Added Google search link for:', cellData.value); // Debugging
            } else {
                cell.textContent = cellData.value;
            }
        });

        // Add click event listener to expand/collapse row
        row.addEventListener('click', () => {
            row.classList.toggle('expanded');
        });
    });

    document.getElementById('pageNumber').textContent = `Page ${state.currentPage} - Subpage ${state.currentSubPage} of ${getTotalSubPages()}`;
}

/* Add function to load all sponsors */
async function loadAllSponsors() {
    let page = 1;
    while (true) {
        const data = await loadSponsors(page);
        if (data.length === 0) {
            break;
        }
        page++;
    }
}

/* Modify searchSponsors to load all data before searching */
async function searchSponsors(searchTerm) {
    // Reset pagination
    state.currentPage = 1;
    state.currentSubPage = 1;

    // Filter from the master list without modifying it
    const allFilteredSponsors = state.allSponsorsData.filter(sponsor => 
        Object.values(sponsor).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    // Remove duplicate sponsors based on a unique identifier, e.g., organisation_name
    const uniqueFilteredSponsors = Array.from(new Set(allFilteredSponsors.map(sponsor => sponsor.organisation_name)))
        .map(name => {
            return allFilteredSponsors.find(sponsor => sponsor.organisation_name === name);
        });

    // Limit search results to 1000
    if (uniqueFilteredSponsors.length > 1000) {
        state.sponsorsData = uniqueFilteredSponsors.slice(0, 1000);
        displaySponsorsPage(1); // Display first page of limited results
        utils.updatePageNumber();
        alertContainer.innerHTML = `
            <div id="alert" class="flex items-center p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-400" role="alert">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span class="font-medium">Search results exceed 1,000. Only the first 1,000 results are displayed. Please refine your search.</span>
                <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-yellow-50 dark:bg-gray-800 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1.5 hover:bg-yellow-200 dark:hover:bg-gray-700 inline-flex h-8 w-8" data-dismiss-target="#alert" aria-label="Close">
                    <span class="sr-only">Close</span>
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        console.log('Search results limited to 1000'); // Debugging
    } else if (uniqueFilteredSponsors.length > 0) {
        state.sponsorsData = uniqueFilteredSponsors;
        displaySponsorsPage(1); // Display first page of search results
        utils.updatePageNumber();
        // Clear any existing alerts
        alertContainer.innerHTML = '';
        console.log('Search results found:', uniqueFilteredSponsors.length); // Debugging
    } else {
        state.sponsorsData = [];
        displaySponsorsPage(1); // Clear the table
        alertContainer.innerHTML = `
            <div id="alert" class="flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span class="font-medium">No matching sponsors found.</span>
                <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-red-50 dark:bg-gray-800 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 dark:hover:bg-gray-700 inline-flex h-8 w-8" data-dismiss-target="#alert" aria-label="Close">
                    <span class="sr-only">Close</span>
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        console.log('No matching sponsors found'); // Debugging
    }

    // Remove map update call since map functionality is removed
    // updateMapMarkers();
}

// Cache DOM elements
const searchInput = document.getElementById('searchInput');
const alertContainer = document.getElementById('alertContainer');
const sponsorsBody = document.getElementById('sponsorsBody');
const pageNumber = document.getElementById('pageNumber');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const themeToggleButton = document.getElementById('theme-toggle');
const backToTopButton = document.getElementById('backToTop');
const sponsorsTable = document.getElementById('sponsorsTable');
const buttons = document.querySelectorAll('button');

// Refine debounce utility to handle 'this' context
const utils = {
    debounce: function(func, delay) {
        return function(...args) {
            clearTimeout(state.debounceTimeout);
            state.debounceTimeout = setTimeout(() => func.apply(this, args), delay);
        };
    },
    updatePageNumber: () => {
        pageNumber.textContent = `Page ${state.currentPage} - Subpage ${state.currentSubPage} of ${getTotalSubPages()}`;
    }
};

// Refactored event listeners using cached DOM elements
document.addEventListener('DOMContentLoaded', async () => {
    // Load all sponsors data on initialization
    await loadAllSponsors();
    displaySponsorsPage(state.currentSubPage);

    // Modify search input event listener
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.trim();
        if (searchTerm.length >= 3) {
            utils.debounce(async function() {
                await searchSponsors(searchTerm);
            }, 300)();
        }
    });

    // Add Enter key event listener for searchInput
    searchInput.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
            const searchTerm = e.target.value.trim();
            if (searchTerm.length < 3) {
                await searchSponsors(searchTerm);
            }
        }
    });

    document.getElementById('prevPage').addEventListener('click', async () => {
        if (state.currentSubPage > 1) {
            state.currentSubPage--;
        } else if (state.currentPage > 1) {
            state.currentPage--;
            await loadSponsors(state.currentPage);
            state.currentSubPage = getTotalSubPages();
        }
        displaySponsorsPage(state.currentSubPage);
        utils.updatePageNumber();
    });

    document.getElementById('nextPage').addEventListener('click', async () => {
        const totalSubPages = getTotalSubPages();
        if (state.currentSubPage < totalSubPages) {
            state.currentSubPage++;
        } else {
            state.currentPage++;
            await loadSponsors(state.currentPage);
            state.currentSubPage = 1;
        }
        displaySponsorsPage(state.currentSubPage);
        utils.updatePageNumber();
    });
});

// Add the getTotalSubPages function
function getTotalSubPages() {
    return Math.ceil(state.sponsorsData.length / state.pageSize);
}

// Add dark mode toggle functionality
// const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
// const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

// Change the icons inside the button based on previous settings
if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    themeToggleLightIcon.classList.remove('hidden');
    document.documentElement.classList.add('dark');
} else {
    themeToggleDarkIcon.classList.remove('hidden');
}

themeToggleButton.addEventListener('click', function() {
    themeToggleDarkIcon.classList.toggle('hidden');
    themeToggleLightIcon.classList.toggle('hidden');

    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        }
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }
});

// Enable smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Back to Top Button functionality
// const backToTopButton = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopButton.classList.remove('opacity-0', 'pointer-events-none');
        backToTopButton.classList.add('opacity-100', 'pointer-events-auto');
    } else {
        backToTopButton.classList.remove('opacity-100', 'pointer-events-auto');
        backToTopButton.classList.add('opacity-0', 'pointer-events-none');
    }
});

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Enhance table responsiveness
// const sponsorsTable = document.getElementById('sponsorsTable');
sponsorsTable.classList.add('min-w-full', 'divide-y', 'divide-gray-200');

// Add subtle fade-in animation to buttons
// const buttons = document.querySelectorAll('button');
buttons.forEach(button => {
    button.classList.add('transform', 'transition-transform', 'duration-300', 'hover:scale-105');
});

// Ensure Flowbite is initialized for dynamic alerts
document.addEventListener('click', function(event) {
    if (event.target.closest('[data-dismiss-target]')) {
        const button = event.target.closest('button');
        const dismissTarget = button.getAttribute('data-dismiss-target');
        const targetElement = document.querySelector(dismissTarget);
        if (targetElement) {
            targetElement.remove();
        }
    }
});