angular.module('Realize.content.createOptions', [
    'Realize.paths',
    'Realize.quicklinks.quickLinkMenu',
    'Realize.quicklinks.quickLink',
    'Realize.content',
    'rlzComponents.components.i18n',
    'Realize.common.optionalFeaturesService'
])
    .directive('contentCreateOptions', [
        '$location',
        'Content',
        'Assessment',
        '$currentUser',
        'OptionalFeatures',
        'PATH',
        '$rootScope',
        function($location, Content, Assessment, $currentUser, OptionalFeatures, PATH, $rootScope) {
            'use strict';
            return {
                templateUrl: PATH.TEMPLATE_CACHE + '/app/programs/toc/contentToolbar/contentCreateOptions.dir.html',
                scope: true,
                link: function(scope, element, attrs) {

                    scope.menuDirection = attrs.position === 'bottom' ? 'up' : 'down';
                    scope.content = scope.program = $rootScope.currentProgram;

                    scope.hasBuildETextFeature = OptionalFeatures.isAvailable('buildEText.feature.enabled');
                    scope.hasEssayPromptAccess = scope.currentProgram.hasEssayPromptAccess;

                    scope.showUploadDialog = function(type) {
                        $location.path(Content.getRoute(scope.currentProgram) + '/myContent/' + type);
                    };

                    scope.openCreateAssessment = function() {
                        var createAssessmentPage = $location.path() + '/assessment/create';
                        // For setting the inline test creation message, for a newly created test
                        Assessment.isNewTest = true;
                        $location.path(createAssessmentPage);
                    };

                    scope.openEssayPrompt = function() {
                        var essayPromptPage = Content.getRoute(scope.currentProgram) +
                            '/assessment/essayPrompt';
                        $location.path(essayPromptPage);
                    };

                    scope.openCreateETextSelection = function() {
                        var createETextSelectionPage = $location.path() + '/eText2/create';
                        $location.path(createETextSelectionPage);
                    };

                    scope.openNbcLearnBrowseForMyContent = function() {
                        $location.path('/nbclearn/browse');
                    };
                }
            };
        }
    ]);
