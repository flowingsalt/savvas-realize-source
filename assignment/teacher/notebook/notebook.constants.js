angular.module('Realize.assignment.teacher.notebook.constants', [])
    .constant('NOTEBOOK_CONSTANTS', {
        MAX_HIT_COUNT: 3,
        HTTP_UNAUTHORISED: 401,
        HTTP_PAGE_NOT_FOUND: 404,
        PREFIX: {
            NOTEBOOK_ID: 'NotebookID',
            NOTEBOOK_TOC: 'NotebookTOC',
            NOTEBOOK_TOKEN: 'NotebookToken'
        },
        CONFIG: {
            POST: 'POST',
            CONTENT_TYPE: 'application/json; charset=utf-8',
            ENABLE_MULTI_SORT_PROMPTS: 'enableMultiSortPrompts',
            DEFAULT_SORT_PROMPTS_BY: 'defaultSortPromptsBy'
        },
        DISPLAY_TYPE: 'date',
        ENTRIES_PER_PAGE: 20,
        APP_NAME: 'notebook'
    });
