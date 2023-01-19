angular.module('admin.jobs.programMetadataFilter', [
        'rlzComponents.components.i18n'
    ])
    .filter('adminProgramMetadata', [
        'lwcI18nFilter',
        function(lwcI18nFilter) {
            'use strict';

            return function(input) {
                if (input) {
                    if (input.split(',').length > 1) {
                        return lwcI18nFilter('jobSelector.listing.metadata.sharedProgram');
                    }
                    return input.replace(/(\[|\])/g, '');
                } else {
                    return input;
                }
            };
        }
    ]);
