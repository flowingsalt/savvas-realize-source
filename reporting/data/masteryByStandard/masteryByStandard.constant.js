angular.module('Realize.standard.constants', [])
    .constant('STANDARD_CONSTANTS', {
        STANDARD_TRUNCATION: {
            CHARACTER_LIMIT: 9,
            ELLIPSIS_AT_BEGINING: true
        },
        TYPE: 'Mastery by Standard',
        DIRECTION: {
            UP: 'up',
            DOWN: 'down',
            DEFAULT: 'default'
        },
        HEADER_COLUMN_IDENTIFIER: {
            NAME: 'name',
            PERCENT: 'percent',
            STANDARD: 'standard',
            SCORE: 'score',
        },
        STANDARD_SCORE_COLOR: {
            SKIP: 'Skip',
            FAIL: 'Fail',
            PASS: 'Pass'
        },
        SORT_TYPE: {
            ASC: 'ASC',
            DESC: 'DESC',
        },
        SORT_FIELD: {
            NAME: 'Name',
            MASTERED: 'Mastered',
            STANDARD_PROFICIENCY: 'standardProficiencySortType',
            SCORE: 'Score',
        },
        STANDARD_MASTERY_BY_CLASS: 'standardMasteryByClass',
        STANDARD_MASTERY_BY_ASSIGNMENT: 'standardMasteryByAssignment',
        MASTERY_CUTOFF: 70,
        STANDARD_ERROR_MESSAGE: 'FILTERED_ASSIGNMENTS_NOT_PART_OF_CLASS',
    });
