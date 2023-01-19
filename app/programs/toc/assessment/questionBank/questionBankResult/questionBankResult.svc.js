angular.module('Realize.assessment.questionBankResultService', [])
    .service('QuestionBankResultService', [

        function() {
            'use strict';

            this.selectedQuestionId = null;

            this.summaryCallCompleted = false;

            this.questionBankSummaryCollection = [];

            this.getSelectedQuestionId = function() {
                return this.selectedQuestionId;
            };

            this.setSelectedQuestionId = function(selectedQId) {
                this.selectedQuestionId = selectedQId;
            };

            this.resetSelectedQuestionId = function() {
                this.setSelectedQuestionId(null);
            };

            this.resetSelectedQuestionInBank = function(questionBank) {
                var svc = this;
                if (svc.getSelectedQuestionId() === null) {
                    return;
                } else {
                    _.map(questionBank.questions, function(question) {
                        if (svc.getSelectedQuestionId() === question.id) {
                            svc.resetSelectedQuestionId();
                            return;
                        }
                    });

                }
            };
        }
    ]);
