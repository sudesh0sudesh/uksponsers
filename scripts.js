// Modularize state management
const state = {
    currentPage: 1,
    currentSubPage: 1,
    pageSize: 100,
    sponsorsData: [],
    debounceTimeout: null,
};

// Refactored loadSponsors function
async function loadSponsors(page) {
    loadingIndicator.style.display = 'block';
    try {
        const response = await fetch(`sponsors_pages/sponsors_page_${page}.json`);
        const data = await response.json();
        state.sponsorsData = data;
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
function displaySponsorsPage(subPage, searchTerm = '') {
    const tbody = document.getElementById('sponsorsBody');
    tbody.innerHTML = '';

    const start = (subPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageSponsors = state.sponsorsData.slice(start, end);

    const filteredSponsors = pageSponsors.filter(sponsor => 
        Object.values(sponsor).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    filteredSponsors.forEach(sponsor => {
        const row = tbody.insertRow();
        row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
        
        const cells = [
            sponsor.organisation_name || '',
            sponsor.town_city || '',
            sponsor.county || '',
            sponsor.type_rating || '',
            sponsor.route || ''
        ];

        cells.forEach(text => {
            const cell = row.insertCell();
            cell.className = 'px-6 py-4';
            cell.textContent = text;
        });
    });

    document.getElementById('pageNumber').textContent = `Page ${state.currentPage} - Subpage ${state.currentSubPage} of ${getTotalSubPages()}`;
}

// Refactored searchSponsors function
async function searchSponsors(searchTerm) {
    state.currentPage = 1;
    state.currentSubPage = 1;
    let allFilteredSponsors = [];
    let hasMorePages = true;

    while (hasMorePages) {
        const sponsors = await loadSponsors(state.currentPage);
        if (sponsors.length === 0) {
            hasMorePages = false;
            break;
        }

        const totalSubPages = getTotalSubPages();
        for (let sub = 1; sub <= totalSubPages; sub++) {
            const start = (sub - 1) * state.pageSize;
            const end = start + state.pageSize;
            const pageSponsors = state.sponsorsData.slice(start, end);

            const filtered = pageSponsors.filter(sponsor => 
                Object.values(sponsor).some(value => 
                    String(value).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );

            if (filtered.length > 0) {
                allFilteredSponsors = allFilteredSponsors.concat(filtered);
            }
        }

        state.currentPage++;
        state.currentSubPage = 1;
    }

    if (allFilteredSponsors.length > 0) {
        state.sponsorsData = allFilteredSponsors;
        displaySponsorsPage(1, searchTerm);
        state.currentPage = 1;
        state.currentSubPage = 1;
        document.getElementById('pageNumber').textContent = `Page ${state.currentPage} - Subpage ${state.currentSubPage} of ${getTotalSubPages()}`;
        // Clear any existing alerts
        document.getElementById('alertContainer').innerHTML = '';
    } else {
        displaySponsorsPage(1, searchTerm);
        document.getElementById('alertContainer').innerHTML = `
            <div id="alert" class="flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span class="font-medium">No matching sponsors found.</span>
                <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-red-50 dark:bg-gray-800 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 dark:hover:bg-gray-700 inline-flex h-8 w-8" data-dismiss-target="#alert" aria-label="Close">
                    <span class="sr-only">Close</span>
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
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
    await loadSponsors(state.currentPage);
    displaySponsorsPage(state.currentSubPage);

    searchInput.addEventListener('input', utils.debounce(async function(e) {
        if (e.target.value.trim() === '') {
            state.currentPage = 1;
            state.currentSubPage = 1;
            await loadSponsors(state.currentPage);
            displaySponsorsPage(state.currentSubPage);
            utils.updatePageNumber();
            // Clear any existing alerts
            alertContainer.innerHTML = '';
        } else {
            await searchSponsors(e.target.value);
        }
    }, 300));

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