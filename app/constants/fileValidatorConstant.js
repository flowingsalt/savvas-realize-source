angular.module('Realize.constants.fileValidatorType', [
])
    .constant('FILE_VALIDATOR_TYPE', {
        FILE_SIZE_VALIDATOR: {
            MIN_FILE_SIZE: 1024,
            MAX_FILE_SIZE: 10485760
        },
        FILE_TYPE_VALIDATOR: {
            DOC_TYPE: 'doc',
            DOCX_TYPE: 'docx',
            PPT_TYPE: 'ppt',
            PPTX_TYPE: 'PPTX',
            JPG_TYPE: 'jpg',
            PNG_TYPE: 'PNG',
            MP3_TYPE: 'mp3',
            MP4_TYPE: 'mp4',
            PDF_TYPE: 'pdf'
        }
    });
