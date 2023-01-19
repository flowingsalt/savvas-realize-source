angular.module('Realize.reporting.data.masteryByStandardsFilters', [
    'Realize.reporting.MasteryByStandardReport'
])
    .directive('masteryByStandardsFilters', [
        '$log',
        '$rootScope',
        'MasteryByStandardReport',
        function($log, $rootScope, MasteryByStandardReport) {
            'use strict';

            return {
                templateUrl: 'templates/reporting/data/masteryByStandardsFilters/masteryByStandardsFilters.html',
                restrict: 'A',
                scope: {
                    isFilterByStudent: '=?displayStudentFilter',
                    studentId: '=?',
                    classRosterData: '=',
                    masteryStandardData: '='
                },
                link: function(scope) {
                    var classId = scope.classRosterData.classId,
                        savedFilter = MasteryByStandardReport.getSavedFilterOptions($rootScope.currentUser, classId),
                        populateDropdown = function() {
                            if (scope.isFilterByStudent) {
                                var removedStudent = MasteryByStandardReport.getRemovedStudent(classId);
                                if (angular.isDefined(removedStudent)) {
                                    scope.studentList = [removedStudent].concat(scope.classRosterData.students);
                                } else {
                                    scope.studentList = scope.classRosterData.students;
                                }

                                scope.selectedStudent = _.findWhere(scope.studentList, {
                                    'userId': scope.studentId
                                });
                            }
                            scope.programList = scope.masteryStandardData.programNames;
                            scope.standardLibraries = scope.masteryStandardData.standardLibraries;
                            scope.programName = scope.masteryStandardData.selectedProgramName;
                            scope.selectedLibrary = _.findWhere(scope.standardLibraries, {
                                'standardFullTerm': scope.masteryStandardData.selectedStandardLibraryId
                            });
                        },
                        notifyFilterUpdate = function() {
                            persistFilter();
                            var newFilter = {
                                selectedStudent: scope.selectedStudent,
                                programName: scope.programName,
                                selectedLibrary: scope.selectedLibrary
                            };
                            scope.$emit('masteryStandard.filters.updated', newFilter);
                        },
                        persistFilter = function() {
                            savedFilter.programName = scope.programName;
                            if (scope.selectedLibrary && scope.selectedLibrary.standardFullTerm) {
                                savedFilter.standardsLibraryFullPath = scope.selectedLibrary.standardFullTerm;
                            } else {
                                savedFilter.standardsLibraryFullPath = null; //Clear standard selection
                            }
                            MasteryByStandardReport.saveFilterOptions($rootScope.currentUser, classId, savedFilter);
                        };

                    scope.selectStudent = function(student) {
                        if (scope.selectedStudent !== student) {
                            scope.selectedStudent = student;
                            notifyFilterUpdate();
                        }
                    };

                    scope.selectProgram = function(program) {
                        if (scope.programName !== program) {
                            scope.programName = program;
                            scope.selectedLibrary = null; //Clear on program change so it fetch first one again
                            notifyFilterUpdate();
                        }
                    };

                    scope.selectStandard = function(standard) {
                        if (scope.selectedLibrary !== standard) {
                            scope.selectedLibrary = standard;
                            notifyFilterUpdate();
                        }
                    };

                    scope.$watch('masteryStandardData', function() {
                        populateDropdown();
                    }, true);

                }
            };
        }
    ]);
