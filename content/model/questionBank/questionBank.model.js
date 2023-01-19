angular.module('Realize.content.model.questionBank', [
    'Realize.content.model.questionBankItem'
])
    .factory('QuestionBank', [
        'QuestionBankItem',
        function(QuestionBankItem) {
            'use strict';

            var QuestionBank = function(json) {
                var self = this,
                    questions = [];
                angular.copy(json || {}, self);

                self.selected = self.selected || false;
                self.selectedCount = self.selectedCount || 0;

                //Wrap questions
                _.each(self.questions, function(question) {
                    questions.push(new QuestionBankItem(question, self.questionBankId));
                });
                self.questions = questions;

                Object.defineProperties(self, {
                    questionCount: {
                        get: function() {
                            return self.questions.length;
                        }
                    },
                    isEmptyChildList: {
                        get: function() {
                            return this.questionCount === 0;
                        }
                    },
                    selectedAllQuestions: {
                        get: function() {
                            return this.questionCount === this.selectedQuestionCount;
                        }
                    },
                    selectedQuestion: {
                        get: function() {
                            return _.filter(self.questions, function(question) {
                                return question.selected;
                            });
                        }
                    },
                    selectedQuestionCount: {
                        get: function() {
                            return this.selectedQuestion.length;
                        }
                    },
                    selectedSummary: {
                        get: function() {
                            return {
                                questionBankId: this.questionBankId,
                                questionIds: _.pluck(this.selectedQuestion, 'id'),
                                allQuestions: this.selectedAllQuestions
                            };
                        }
                    }
                });
            };

            return QuestionBank;
        }
    ]);
