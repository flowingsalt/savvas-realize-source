angular.module('Realize.assessment.questionBankItemDirective', [
    'RealizeDirectives', // for quickList, qlClick & quickLink
    'rlzComponents.components.i18n',
    'rlzComponents.components.questionBankStandardsModal',
    'rlzComponents.components.questionBankTelemetryModule',
    'Realize.assessment.questionBankResultService',
    'Realize.assessment.questionBankDataService'
])
    .directive('questionBankItem', [
        'lwcI18nFilter',
        'questionBankStandardsModal',
        'QuestionBankResultService',
        'QuestionBankDataService',
        'questionBankTelemetryService',
        'currentUser',
        function(lwcI18nFilter, questionBankStandardsModal, QuestionBankResultService, QuestionBankDataService,
            questionBankTelemetryService, currentUser) {
            'use strict';

            return {
                link: function(scope) {
                    scope.questionId = '';
                    scope.qSummary = {};

                    scope.toggle = function(event) {
                        if (angular.isDefined(scope.obj.isEmptyChildList) && !scope.obj.isEmptyChildList) {
                            scope.obj.expanded = !scope.obj.expanded;
                            if (scope.obj.expanded) {
                                scope.$emit('questionBankItem.toggleShowQuestion.questionBankExpanded', scope.obj);
                            }
                            QuestionBankResultService.resetSelectedQuestionInBank(scope.obj);
                        } else {
                            scope.toggleShowQuestion(event);
                        }
                    };

                    scope.getSelectedQuestionIndex = function() {
                        var qIndex;
                        _.find(scope.qSummary.questions, function(question, qId) {
                            if (question.id === scope.obj.id) {
                                qIndex = qId;
                                scope.qSummary.position = qId + 1;
                                return true;
                            }
                        });
                        return qIndex;
                    };

                    scope.toggleShowQuestion = function(event) {
                        if (QuestionBankResultService.summaryCallCompleted) {
                            event.stopImmediatePropagation();
                            scope.$emit('questionBankItem.toggleShowQuestion.clicked', scope.obj.id);
                            scope.qSummary =
                                QuestionBankResultService.questionBankSummaryCollection[scope.obj.parentBankId];
                            scope.questionId =
                                scope.qSummary.questionIds[scope.getSelectedQuestionIndex()];
                        }
                    };

                    scope.isQuestion = function() {
                        return (angular.isDefined(scope.obj.parentBankId));
                    };

                    scope.shouldDisplayQuestion = function() {
                        return scope.isQuestion() &&
                            QuestionBankResultService.getSelectedQuestionId() === scope.obj.id;
                    };

                    scope.hasStandards = function() {
                        return scope.obj.standards && scope.obj.standards.length > 0;
                    };

                    scope.$on('expandableTreeItem.leftTreeControl.clicked', function(event) {
                        scope.obj.expanded = !scope.obj.expanded;
                        scope.toggle(event);
                    });

                    scope.displayShowLink = function() {
                        var questionSummary = QuestionBankResultService.questionBankSummaryCollection
                        [scope.obj.parentBankId];
                        if (questionSummary && questionSummary.standards && questionSummary.standards[scope.obj.id]) {
                            var locale = currentUser.userAttributes['profile.locale'];
                            scope.questionStandards = questionSummary.standards[scope.obj.id]
                                .map(function(standard) {
                                    if (standard.spanishDescription &&
                                        (!standard.description || locale === 'es')) {
                                        standard.description = standard.spanishDescription;
                                    }
                                    return standard;
                                });
                        }
                        return scope.isQuestion() && QuestionBankResultService.summaryCallCompleted;
                    };

                    var closeButton = {
                        label: lwcI18nFilter('questionBankResult.standards.close'),
                        ariaLabel: lwcI18nFilter('questionBankResult.standards.close'),
                        action: function() {
                            scope.modalCloseAction();
                        },
                        className: 'button__close',
                        disabled: false,
                    };

                    var buttons = [
                        closeButton
                    ];
                    var cssClassName = 'questionBank__StandardsModal';

                    scope.modalCloseAction = function() {
                        questionBankStandardsModal.deactivate();
                        var element = document.getElementById('questionBankStandard-' + scope.obj.questionBankId);
                        if (element) {
                            element.focus();
                        }
                    };

                    scope.openModal = function(event) {
                        event.stopPropagation();
                        questionBankTelemetryService
                            .sendTelemetryEvents(QuestionBankDataService.getSearchQuestionBankActiveTab());
                        questionBankStandardsModal.activate({
                            standardsList: scope.obj.standards,
                            closeAction: function() {
                                scope.modalCloseAction();
                            },
                            cssClass: cssClassName,
                            headerText: lwcI18nFilter('questionBankResult.standards.standardsIn') + scope.obj.title,
                            buttons: buttons
                        });
                    };
                }
            };
        }
    ]);
