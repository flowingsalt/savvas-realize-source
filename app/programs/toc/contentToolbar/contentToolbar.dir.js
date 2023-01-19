angular.module('Realize.program.content.toolbar', [
    'Realize.paths',
    'Realize.quicklinks.quickLink',
    'Realize.quicklinks.quickLinkMenu',
    'Realize.content.createOptions',
    'rlzComponents.components.createContentDropdown',
    'components.buttons.customButton',
])
    .directive('contentToolbar', [
        '$location',
        '$rootScope',
        'PATH',
        'Content',
        'OptionalFeatures',
        'Assessment',
        'CONTENT_UPLOAD_TYPES',
        function($location, $rootScope, PATH, Content, OptionalFeatures, Assessment, CONTENT_UPLOAD_TYPES) {
            'use strict';
            return {
                templateUrl: PATH.TEMPLATE_CACHE + '/app/programs/toc/contentToolbar/contentToolbar.dir.html',
                scope: true,
                controller: ['$scope', function($scope) {
                    $scope.program = $rootScope.currentProgram;
                    // setting boolean flag to check if BuildETextFeature is enable or not
                    $scope.hasBuildETextFeature = OptionalFeatures.isAvailable('buildEText.feature.enabled');
                    var hasEssayPromptAccess = $rootScope.currentProgram.hasEssayPromptAccess;
                    var inCentersTab = $location.path().indexOf('centers') >= 0;

                    var viewOnSelectedOptions = function(type) {
                        if (type === CONTENT_UPLOAD_TYPES.GOOGLE_DRIVE || type === CONTENT_UPLOAD_TYPES.FILE ||
                            type === CONTENT_UPLOAD_TYPES.LINK) {
                            $location.path(Content.getRoute($scope.program) + '/myContent/' + type);
                        } else if (type === CONTENT_UPLOAD_TYPES.BUILD_TEST) {
                            var createAssessmentPage = $location.path() + '/assessment/create';
                            // For setting the inline test creation message, for a newly created test
                            Assessment.isNewTest = true;
                            $location.path(createAssessmentPage);
                        } else if (type === CONTENT_UPLOAD_TYPES.ESSAY_PROMPT) {
                            var essayPromptPage = Content.getRoute($scope.program) + '/assessment/essayPrompt';
                            $location.path(essayPromptPage);
                        } else if (type === CONTENT_UPLOAD_TYPES.ETEXT) {
                            var createETextSelectionPage = $location.path() + '/eText2/create';
                            $location.path(createETextSelectionPage);
                        }
                    };

                    $scope.onCreateContentOptions = {
                        onCreateContentOptionsUpdate: viewOnSelectedOptions,
                        inCentersTab: inCentersTab,
                        hasEssayPromptAccess: hasEssayPromptAccess,
                        program: $scope.program,
                        content: $scope.program,
                        hasBuildEtextFeature: $scope.hasBuildETextFeature
                    };
                }],
                link: {
                    pre: function(scope, element, attrs) {
                        scope.position = attrs.position || '';
                        scope.menuDirection = 'down';
                        if (scope.position === 'bottom') {
                            scope.menuDirection = 'up';
                            scope.dropup = 'dropup';
                        }
                    }
                }
            };
        }
    ]);
