angular.module('Realize.standards.reviewerStandardsContentCtrl', [
        'RealizeDataServices', // for Content - will be deprecated soon
        'Realize.content.model.contentItem',
        'Realize.standards.standardDataService',
        'Realize.common.expandableTreeDirective'
    ])
    .controller('ReviewerStandardsContentCtrl', [
        '$log',
        '$scope',
        '$rootScope',
        '$routeParams',
        '$location',
        'LessonData',
        'StandardData',
        'Content',
        'Standard',
        function($log, $scope, $rootScope, $routeParams, $location, LessonData, StandardData, Content,
            StandardService) {
            'use strict';

            var grade = StandardService.urlDecode($routeParams.lastSelectedGrade);

            var indexLearningModels = function(content) {
                if (!content || !content.contentItems) {
                    return content;
                }
                var i = 0;
                angular.forEach(content.contentItems, function(item) {
                    if (item.mediaType === 'Learning Model') {
                        item.lmKey = (i++ % 3);
                    }
                });
                return content;
            };

            $scope.program = $rootScope.currentProgram;
            $scope.content = indexLearningModels(LessonData.results[0]);
            $scope.standard = StandardData;

            $scope.back = function() {
                var program = $scope.program;
                $location.path('/review/program/' + program.id + '/' + program.version + '/standards');
                $location.search('lastSelectedGrade', StandardService.urlEncode(grade));
            };

            $scope.open = function(event, item) {
                var itemToOpen, p;
                if (item.mediaType === 'Student Voice' || item.mediaType === 'Learning Model') {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                itemToOpen = item.$getDefaultVersion();
                p = $location.path();

                if (item.isExternalResource()) {
                    itemToOpen.version = 1;
                    itemToOpen.id = itemToOpen.originalEquellaItemId;
                }

                if (item.$isNbcItem()) {
                    p = ['/nbclearn/video', item.id, item.version].join('/');
                } else {
                    // there should never be nested lessons or other containers, only content
                    p = [p, 'content', itemToOpen.id, itemToOpen.version].join('/');
                }

                $location.path(p);
            };
        }
    ]);
