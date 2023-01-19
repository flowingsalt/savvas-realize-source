angular.module('Realize.assessment.searchQuestionBankDataService', [
    'Realize.paths',
    'Realize.content.constants',
    'Realize.content.model.questionBank'
])
    .service('SearchQuestionBankDataService', [
        '$http',
        '$log',
        '$q',
        'PATH',
        'CONTENT_CONSTANTS',
        'QuestionBank',
        function($http, $log, $q, PATH, CONTENT_CONSTANTS, QuestionBank) {
            'use strict';

            var service = {},
                formatBankResult = function(questionBanks) {
                    var questionBankList = [];
                    if (questionBanks) {
                        _.each(questionBanks, function(questionBank) {
                            questionBankList.push(new QuestionBank(questionBank));
                        });
                    }
                    return questionBankList;
                };

            service.encodeStandards =  function(standards) {
                var encodedStandardList = [];
                if (standards.length) {
                    _.each(standards, function(standard) {
                        encodedStandardList.push(encodeURIComponent(standard));
                    });
                }
                return encodedStandardList;
            };

            service.searchBanksByStandards = function(programs, standards) {
                var encodedStandards = service.encodeStandards(standards);
                return service.getAvailableQuestionBanks({
                    'programs': programs,
                    'standards': encodedStandards,
                    'page'    : 1,
                    'pageSize': CONTENT_CONSTANTS.SEARCH_RESULT_PAGE_SIZE,
                    'calculateTotalAvailableQuestions': true
                });
            };

            service.getAvailableQuestionBanks = function(params) {
                return $http({
                    url: PATH.REST + '/assessment/questionbanks',
                    method: 'GET',
                    params: {
                        'programs': params.programs,
                        'standards' : params.standards,
                        'page'    : params.page,
                        'pageSize' : params.pageSize,
                        'calculateTotalAvailableQuestions' : params.calculateTotalAvailableQuestions,
                        'nativeBanks': false
                    }
                }).then(function(response) {
                    var result = response.data;
                    result.questionBanks = formatBankResult(result.questionBanks);
                    return result;
                }, function(err) {
                    $log.error('Failed to retrieve question banks', err);
                    return $q.reject('Failed to retrieve question banks', err);
                });
            };
            return service;
        }
    ]);
