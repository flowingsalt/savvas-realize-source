angular.module('Realize.assessment.searchBanksByStandardDirective', [
        'Realize.paths',
        'Realize.content.model.contentItem',
        'Realize.analytics',
        'Realize.standards.standardDataService',
        'Realize.common.expandableTreeDirective',
        'Realize.assessment.standardWithBankItemDirective',
        'Realize.assessment.searchByStandardService',
        'Realize.assessment.searchQuestionBankDataService'
    ])
    .directive('searchBanksByStandard', [
        '$log',
        '$location',
        'PATH',
        '$rootScope',
        '$routeParams',
        'Analytics',
        'Content',
        'Standard',
        'SearchByStandardService',
        'SearchQuestionBankDataService',
        function($log, $location, PATH, $rootScope, $routeParams, Analytics, Content, Standard, SearchByStandardService,
             SearchQuestionBankDataService) {
            'use strict';

            return {
                scope: {
                    standardsTreeData: '='
                },
                templateUrl: PATH.TEMPLATE_CACHE +
                    '/app/programs/toc/assessment/questionBank/searchBanksByStandard/' +
                    'searchBanksByStandard.dir.html',

                link: function(scope) {
                    var gradeToOptions = {},
                        lastSelectedGrade = Standard.urlDecode($routeParams.lastSelectedGrade),
                        selectedOption,
                        setSelectedStandard,
                        numOfStandardsWithBanks,
                        setStandardTree,
                        updateStandard,
                        updateCurrentSelectedStandardList,
                        notifyNewSearchResult,
                        searchAndNotifySearchResult,
                        cleanStandardsSelectionField,
                        selectedStandardListId;

                    scope.grades = _.sortBy(
                        _.uniq(scope.standardsTreeData.standards.grades, '')
                    );

                    if (!$rootScope.currentProgram) {
                        $rootScope.currentProgram = {};
                    }

                    scope.standardsMap = scope.standardsTreeData.standards.map;
                    scope.program = $rootScope.currentProgram.library = scope.standardsTreeData.program.library;
                    scope.options = [];

                    scope.update = function(option) {
                        $location.search('lastSelectedGrade', Standard.urlEncode(option.grade));
                        scope.current = gradeToOptions[option.grade];
                        SearchByStandardService.resetSelectedStandardList();
                        cleanStandardsSelectionField(scope.current.standards);
                    };

                    cleanStandardsSelectionField = function(standards) {
                        _.map(standards, function(standard) {
                            standard.selected = false;
                            if (standard.children && standard.children.length > 0) {
                                cleanStandardsSelectionField(standard.children);
                            }
                        });
                    };

                    angular.forEach(scope.grades, function(grade) {
                        var option = {
                            grade: grade,
                            standards: scope.standardsMap[grade]
                        };
                        scope.options = scope.options.concat(option);
                        gradeToOptions[grade] = option;
                    });

                    if (scope.grades && scope.grades.length) {
                        selectedOption = gradeToOptions[lastSelectedGrade || scope.grades[0]];
                        scope.update(selectedOption);
                    }
                    scope.standardTemplate = PATH.TEMPLATE_CACHE +
                        '/app/programs/toc/assessment/questionBank/searchBanksByStandard/standardWithBankItem.dir.html';

                    scope.selectedStandardList = SearchByStandardService.selectedStandardList;

                    setSelectedStandard = function(selectedStandard, flag) {
                        _.map(selectedStandard.children, function(standard) {
                            standard.selected = flag;

                            if (standard.children && standard.children.length > 0) {
                                setSelectedStandard(standard, flag);
                            }

                        });
                    };

                    numOfStandardsWithBanks = function(standards) {
                        return _.filter(standards.children, function(standard) {
                            return standard.count > 0;
                        });
                    };

                    setStandardTree = function(root, selectedStandardNode, selectedFlag, isFound) {

                        if (root === null) {
                            return isFound;
                        }

                        if (root.id === selectedStandardNode.id) {
                            setSelectedStandard(selectedStandardNode, selectedFlag);
                            isFound = true;
                            return isFound;
                        }

                        var numOfSelectedChildren = 0,
                            numOfChildren = numOfStandardsWithBanks(root).length,
                            i,
                            standard;

                        for (i = 0; i < root.children.length; i++) {
                            standard = root.children[i];

                            if (standard.id === selectedStandardNode.id) {
                                standard.selected = selectedFlag;
                                setSelectedStandard(selectedStandardNode, selectedFlag);
                                isFound = true;
                            }
                            if ((standard.count > 0) && standard.selected) {
                                numOfSelectedChildren++;
                            }
                        }

                        if (isFound) {
                            root.selected = (numOfChildren === numOfSelectedChildren) ? true : false;
                            return isFound;
                        } else {
                            for (i = 0; i < root.children.length; i++) {
                                if (root.children[i].count > 0) {
                                    isFound =
                                        setStandardTree(root.children[i], selectedStandardNode,
                                            selectedFlag, isFound);
                                    if (isFound) {
                                        if (!selectedFlag) {
                                            root.selected = false;
                                        } else {
                                            if (root.children[i].selected) {
                                                numOfSelectedChildren++;
                                            }
                                            root.selected = (numOfChildren === numOfSelectedChildren) ?
                                                true : false;
                                        }
                                        break;
                                    }
                                }
                            }
                            return isFound;
                        }
                    };

                    updateStandard = function(standards) {
                        if (standards.count > 0) {
                            if (standards.selected) {
                                SearchByStandardService.addStandard(standards);
                                return;
                            } else {
                                _.map(standards.children, function(standard) {
                                    if (standard.count > 0) {
                                        updateStandard(standard);
                                    }
                                });
                            }
                        }

                        return;
                    };

                    updateCurrentSelectedStandardList = function() {
                        _.map(scope.current.standards, function(standards) {
                            updateStandard(standards);
                        });
                        return SearchByStandardService.selectedStandardList;
                    };

                    scope.$on('expandableTreeItem.selectCheckbox.select', function(event, selectedStandard) {
                        var i;

                        SearchByStandardService.resetSelectedStandardList();
                        for (i = 0; i < scope.current.standards.length; i++) {
                            if (scope.current.standards[i].count > 0 && setStandardTree(scope.current.standards[
                                        i],
                                    selectedStandard, selectedStandard.selected, false)) {
                                break;
                            }
                        }

                        scope.selectedStandardList = updateCurrentSelectedStandardList();
                    });

                    notifyNewSearchResult = function(result, selectedStandardListId) {
                        $rootScope.$broadcast('searchBanksByStandard.result.received', result,
                            selectedStandardListId);
                    };

                    searchAndNotifySearchResult = function() {
                        selectedStandardListId = _.pluck(SearchByStandardService.selectedStandardList, 'id');
                        Analytics.track('track.action', {
                            category: 'Programs',
                            action: 'Build a test',
                            label: 'Search selected standards'
                        });
                        SearchQuestionBankDataService.searchBanksByStandards(scope.program,
                                selectedStandardListId)
                            .then(function(result) {
                                    $rootScope.pageLoaded();
                                    notifyNewSearchResult(result, selectedStandardListId);
                                },
                                function(err) {
                                    $rootScope.pageLoaded();
                                    $log.error('Cannot retrieve question banks', err);
                                });
                    };

                    scope.searchQuestions = function() {
                        $rootScope.pageLoading();
                        SearchByStandardService.selectedStandardListIdResult = [];
                        searchAndNotifySearchResult();
                    };

                    $rootScope.$on('AssessmentAddQuestionBankCtrl.removeStandard', function(event) {
                        event.stopPropagation();
                        event.preventDefault();
                        scope.searchQuestions();
                    });
                }
            };
        }
    ]);
