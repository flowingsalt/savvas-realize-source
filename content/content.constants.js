angular.module('Realize.content.constants', [])
    .constant('CONTENT_CONSTANTS', {
        FACET: {
            PLAYER_TARGET: 'PLAYER_TARGET'
        },
        MEDIA_TYPE: {
            QUESTION_BANK: 'Question Bank',
            ADAPTIVE: 'ADAPTIVE',
            ADAPTIVE_HOMEWORK: 'Adaptive Homework',
            RRSSCO: 'RRSSCO',
            DISCUSSION_PROMPT: 'Discussion Prompt',
            GOOGLE_DOC: 'Google Doc',
            LEVELED_READER: 'Leveled Reader',
            DOCUMENT: 'Document'
        },
        FILE_TYPE: {
            SCO: 'SCO',
            TIN_CAN_SCO: 'TinCanSCO',
            URL: 'URL',
            PDF: 'PDF',
            GOORU: 'GOORU',
            OPEN_ED: 'OPENED',
            TEST: 'TEST',
            SEQUENCE: 'Sequence'
        },
        ITEM_TYPE: {
            RRSSCO: 'RRSSCO'
        },
        PLAYER_TARGET: {
            MATHXL: 'mathxl',
            REALIZE: 'realize',
            TESTNAV: 'testnav'
        },
        QUESTION_BANK_TYPE: {
            TEST: 'Test'
        },
        STAR_POPOVER_TYPE: {
            FIRST_CORRECT_ANSWER: 'firstCorrectAnswer',
            FIRST_STAR_GAINED: 'firstStarGained',
            FIRST_STAR_LOST: 'firstStarLost'
        },
        CONTENT_VIEWER_ACTIVITY: {
            STARTS: 'starts',
            STOPS: 'stops'
        },
        SEARCH_RESULT_PAGE_SIZE: 10,
        FIXED_VALUE_MAX_QUESTIONS: 15,
        FIXED_VALUE_MAX_SCORE: 5,
        MAX_ASSESSMENT_CUSTOMISE_VERSIONS: 5,
    });
