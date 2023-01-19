angular.module('Realize.filters.mediaIcon', [
        'Realize.filters.underscores'
    ])
    .filter('mediaIcon', [
        '$filter',
        function($filter) {
            'use strict';

            return function(input) {
                if (!angular.isDefined(input) || input === null ||
                    !angular.isDefined(input.mediaType) ||
                    !angular.isDefined(input.fileType)) {
                    return;
                }

                var mediaType = $filter('lowercase')(input.mediaType),
                    fileType = $filter('lowercase')(input.fileType);

                // is it a document?
                if (mediaType === 'document') {
                    if (fileType.search(/\.(doc|txt|rtf)/)) {
                        return 'document';
                    }

                    if (fileType.indexOf('ppt') !== -1) {
                        return 'slideshow';
                    }
                    if (fileType.indexOf('pdf') !== -1) {
                        return 'pdf';
                    }
                }

                // is it visual learning?
                if (input.contentType === 'Visual Learning') {
                    return 'visual_learning';
                }

                // is it remediation?
                if (mediaType.indexOf('remediation') !== -1) {
                    return 'lesson';
                }

                // default to using the mediaType
                return $filter('underscores')(mediaType);
            };
        }
    ]);
