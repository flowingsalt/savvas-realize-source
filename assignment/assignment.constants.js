angular.module('Realize.assignment.constants', [])
    .constant('ASSIGNMENT_CONSTANTS', {
        ASSIGNEE_TYPE: {
            CLASS: 'CLASS',
            GROUP: 'GROUP',
            STUDENT: 'STUDENT'
        },
        ASSIGNMENT_TYPE: {
            BASIC: 'BASIC',
            ENRICHMENT: 'ENRICHMENT',
            REMEDIATION: 'REMEDIATION',
            MULTISTAGE: 'MULTISTAGE'
        },
        GRADE_TYPE: {
            ALL: 'ALL',
            GRADED: 'GRADED',
            NOT_GRADED: 'NOT_GRADED',
            NOTGRADED: 'NOTGRADED'
        },
        STATUS: {
            COMPLETED: 'completed',
            IN_PROGRESS: 'in_progress',
            NOT_STARTED: 'not_started',
            UNKNOWN: 'unknown',
            SUBMITTED: 'submitted'
        },
        ATTACHMENT_STATUS: {
            DELETED: 'Marked for Deletion',
            LIVE: 'Not Marked for Deletion',
            UNKNOWN: 'UNKNOWN'
        },
        PAGE_SIZE: {
            MOBILE: 5,
            DESKTOP: 10
        },
        EXTERNAL_SOURCE: {
            OPENED: 'OpenEd'
        },
        FILE_TYPE: {
            OPENED: 'OpenEd'
        },
        ASSIGNMENT_STATUS: {
            COMPLETED: 'realize.assignment.completed',
            IN_PROGRESS: 'realize.assignment.inprogress',
            NOT_STARTED: 'realize.assignment.notstarted',
            ALL: 'realize.assignment.all',
        },
        TITLE_MAX_LENGTH: 75,
        ONESOURCE: 'ONESOURCE',
        ASC: 'ASC',
        DESC: 'DESC',
        INACTIVE: 'INACTIVE',
        DUE_DATE: 'DUE_DATE',
        TITLE: 'TITLE',
        AVAILABLE: 'AVAILABLE',
        CURRENT: 'current',
        EVERYONE: 'EVERYONE',
        FILTER_STATE_KEY: 'assignments.class.filters',
        SORT_STATE_KEY: 'realize.assignments.class.sort',
        SORT_ASSIGNMENT_STUDENT_KEY: 'realize.assignments.student.sort',
        ASSIGNMENT_BYCLASS_KEY: 'realize.assignment.byclass',
        CLASS_DATE_RANGE: 'classDateRange',
        CUSTOM_DATE_RANGE: 'customRange',
        OPTIONAL_FEATURES: {
            COMMENTS: 'comments.feature.enabled'
        },
        TABS: {
            ASSIGNMENTSBYCLASS: 'assignmentsByClass',
            ASSIGNMENTSBYSTUDENT: 'assignmentsByStudent'
        },
        DATE_FORMAT: {
            MM_DD_YY: 'MM/DD/YY',
            MM_DD_YYYY: 'MM/DD/YYYY',
            MM_DD_YY_TIME: 'MM/DD/YY h:mma'
        },
        TIMES: {
            MIN_TIME: '12:00 am',
            MAX_TIME: '11:59 pm',
            MID_DAY: '12:00 pm',
            MINUTES: 'minutes',
            DAY: 'day',
            DAYS: 'days',
            AM: 'am',
            PM: 'pm'
        },
        DEFAULT_REMEDIATION_DAYS: 7,
        ADD_REMEDIATION_DAYS: 1,
        DEEP_LINKED_URL: 'deepLinkedUrl',
    });
