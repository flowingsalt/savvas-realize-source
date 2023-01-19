angular.module('Realize.constants.searchTelemetryEvent', [])
    .constant('SEARCH_TELEMETRY_EVENT', {
        OPEN: 'Open',
        CLOSE: 'Close',
        ADD: 'Add',
        ASSIGN: 'Assign',
        NAME: 'Breadcrumb',
        MORE: 'More link',
        LESS: 'Less link',
        MORE_TEXT: 'More',
        SEARCH_DATA: 'Search',
        PROGRAM_DATA: 'Programs',
        DESCRIPTION: 'Total number of source hierarchies for content item is',
        INFORMATION_MODAL: 'Information modal',
        PAGE_TYPE: {
            SEARCH_PAGE: 'Search results',
            RESOURCES_PAGE: 'Resources',
            STANDARDS_PAGE: 'Standards',
            LEAVELED_READERS_PAGE: 'Leveled readers',
            CREATE_AN_ASSIGNMENT: 'Create an assignment'
        },
        LEVEL_TYPE: {
            SINGLETON: 'singleton',
            ROOT: 'root',
            LEAF: 'leaf',
            INTERMEDIATE: 'intermediate'
        }
    });
