angular.module('Realize.standards.standardsTreeCtrl', [
        'RealizeDataServices', // for Content - will be deprecated soon
        'Realize.content.model.contentItem',
        'Realize.standards.standardDataService',
        'Realize.common.expandableTreeDirective',
        'Realize.paths'
    ])
    .controller('StandardsTreeCtrl', [
        '$log',
        '$scope',
        '$rootScope',
        '$routeParams',
        'Content',
        'Standard',
        '$location',
        'StandardsTreeData',
        'PATH',
        function($log, $scope, $rootScope, $routeParams, Content, Standard, $location,
            StandardsTreeData, PATH) {
            'use strict';

            var gradeToOptions = {},
                lastSelectedGrade = Standard.urlDecode($routeParams.lastSelectedGrade),
                selectedOption;

            $scope.back = function() {
                $location.path('/program', true);
            };

            $scope.grades = $.Enumerable.From(StandardsTreeData.standards.grades).Distinct().OrderBy().ToArray();
            $scope.standardsMap = StandardsTreeData.standards.map;
            $scope.program = $rootScope.currentProgram = StandardsTreeData.program;
            $scope.options = [];

            $scope.update = function(option) {
                $location.search('lastSelectedGrade', Standard.urlEncode(option.grade));
                $scope.current = gradeToOptions[option.grade];
            };

            angular.forEach($scope.grades, function(g) {
                var option = {
                    grade: g,
                    standards: $scope.standardsMap[g]
                };
                $scope.options = $scope.options.concat(option);
                gradeToOptions[g] = option;
            });

            if ($scope.grades && $scope.grades.length) {
                selectedOption = gradeToOptions[lastSelectedGrade || $scope.grades[0]];
                $scope.update(selectedOption);
            }
            $scope.standardTemplate = PATH.TEMPLATE_CACHE + '/app/programs/standards/standardTreeItem.dir.html';

        }
    ]);
