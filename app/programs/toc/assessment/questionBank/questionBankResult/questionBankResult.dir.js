angular.module('Realize.assessment.questionBankResultDirective', [
    'Realize.assessment.questionBankItemDirective',
    'Realize.paths',
    'Realize.common.paginator',
    'Realize.assessment.assessmentDataService',
    'Realize.assessment.questionBankResultService',
    'Realize.assessment.questionBankDataService',
    'Realize.common.expandableTreeDirective',
    'rlzComponents.components.i18n',
    'Realize.assessment.questionsInTestService'
])
    .directive('questionBankResult', [
        '$log',
        '$rootScope',
        'PATH',
        '$location',
        'Assessment',
        'QuestionBankResultService',
        'QuestionBankDataService',
        'lwcI18nFilter',
        'QuestionsInTestService',
        function($log, $rootScope, PATH, $location, Assessment, QuestionBankResultService, QuestionBankDataService,
            lwcI18nFilter, QuestionsInTestService) {
            'use strict';

            return {
                restrict: 'EA',
                templateUrl: PATH.TEMPLATE_CACHE + '/app/programs/toc/assessment/questionBank/questionBankResult/' +
                    'questionBankResult.dir.html',
                link: function(scope) {
                    var selectedQId = null,
                        programs = scope.currentProgram.library,
                        shouldUsePageLoader = false,
                        requestNewPage = function(pageNum) {
                            scope.$emit('questionBankResult.page.change', pageNum);
                        },
                        appendShowNoToggleControlProperty = function(questionBanks) {
                            _.each(questionBanks, function(questionBank) {
                                questionBank.showNoToggleControl = questionBank.isEmptyChildList;
                                _.each(questionBank.questions, function(question) {
                                    question.showNoToggleControl = false;
                                });
                            });
                            return questionBanks;
                        };

                    scope.selectedQuestionBankCollection = {};
                    scope.selectedQuestionCount = 0;

                    scope.questionBankItemTemplate = PATH.TEMPLATE_CACHE +
                        '/app/programs/toc/assessment/questionBank/questionBankItem/questionBankItem.dir.html';

                    scope.questionViewTemplate = PATH.TEMPLATE_CACHE +
                        '/app/programs/toc/assessment/questionBank/questionView/questionView.dir.html';

                    scope.selectedQId = null;

                    scope.$on('addQuestionBank.selectedQuestion.reset', function() {
                        scope.selectedQuestionBankCollection = {};
                        scope.selectedQuestionCount = 0;
                    });
                    scope.questionBankResult = {};
                    scope.$watch('searchResult', function(newVal) {
                        if (newVal && newVal.questionBanks && newVal.questionBanks.length > 0) {
                            newVal.questionBanks = appendShowNoToggleControlProperty(newVal.questionBanks);
                            scope.resultBanks = newVal.questionBanks;
                            scope.questionBankResult = newVal;
                        }
                    }, true);

                    scope.addQuestions = function(selectedItem) {
                        var insertPosition,
                            newAddQuestionCount;
                        if (scope.assessmentInfo.insertPosition) {
                            insertPosition = parseInt(scope.assessmentInfo.insertPosition, 10) - 1;
                        }

                        newAddQuestionCount = QuestionsInTestService.addQuestionsToTest(selectedItem, insertPosition);

                        if (angular.isDefined(insertPosition)) {
                            scope.assessmentInfo.insertPosition = insertPosition + newAddQuestionCount + 1;
                        }
                    };

                    scope.deleteQuestions = function(selectedItem) {
                        var insertPosition;
                        if (scope.assessmentInfo.insertPosition) {
                            insertPosition = parseInt(scope.assessmentInfo.insertPosition, 10) - 1;
                        }
                        insertPosition = QuestionsInTestService.deleteQuestionsFromTest(selectedItem, insertPosition);

                        if (angular.isDefined(insertPosition)) {
                            scope.assessmentInfo.insertPosition = insertPosition + 1;
                        }
                    };

                    scope.$on('expandableTreeItem.selectCheckbox.select', function(event, selectedItem) {
                        var questionBankItems = selectedItem.questions;

                        if (questionBankItems) {
                            //QuestionBank
                            _.each(questionBankItems, function(question) {
                                question.selected = selectedItem.selected;
                            });
                        } else {
                            //Question
                            var parentQuestionBank = _.find(scope.resultBanks, function(questionBank) {
                                return questionBank.questionBankId === selectedItem.parentBankId;
                            });

                            if (parentQuestionBank) {
                                parentQuestionBank.selected = parentQuestionBank.selectedAllQuestions;
                            } else {
                                $log.error('Cannot find associated question bank for', selectedItem);
                            }
                        }

                        return (selectedItem.selected) ? scope.addQuestions(selectedItem) :
                            scope.deleteQuestions(selectedItem);
                    });

                    scope.$on('questionBankItem.toggleShowQuestion.clicked', function(event, selectedQuestionId) {
                        selectedQId = (QuestionBankResultService.getSelectedQuestionId() === selectedQuestionId) ?
                            null : selectedQuestionId;
                        QuestionBankResultService.setSelectedQuestionId(selectedQId);
                    });

                    scope.$on('questionBankItem.toggleShowQuestion.questionBankExpanded',
                        function(event, questionBank) {
                            QuestionBankDataService.getQuestionsSummary(questionBank, programs);
                        });

                    scope.$watch('currentPage', function(newVal, oldVal) {
                        if (newVal !== oldVal) {
                            $log.log('Request page', newVal);
                            requestNewPage(newVal);
                        }
                    });

                    scope.$on('$routeChangeStart', function() {
                        QuestionsInTestService.putQuestionsInAssessment(shouldUsePageLoader);
                    });
                }
            };
        }
    ]);
