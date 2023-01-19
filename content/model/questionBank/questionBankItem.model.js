angular.module('Realize.content.model.questionBankItem', [
])
    .factory('QuestionBankItem', [
        function() {
            'use strict';

            var QuestionBankItem = function(json, parentBankId) {
                var self = this;
                angular.copy(json || {}, self);

                self.selected = self.selected || false;

                if (parentBankId) {
                    self.parentBankId = parentBankId;
                }
            };

            return QuestionBankItem;
        }
    ]);
