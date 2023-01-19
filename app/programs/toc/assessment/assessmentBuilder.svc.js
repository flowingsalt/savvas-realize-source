// This allows us to mock the assessment builder services in test-config.js using the decorator pattern.

angular.module('Realize.assessment.assessmentBuilderServiceInterface', [])
    .service('AssessmentBuilderServiceInterface', function() {
        'use strict';

        return angular.copy(UXF.AssessmentBuilder);
    });
