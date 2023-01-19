angular.module('Realize.assessment.questionsInTestService', [
    'webStorageModule'
])
    .service('QuestionsInTestService', [
        '$rootScope',
        '$log',
        'Assessment',
        'webStorage',
        function($rootScope, $log, Assessment, webStorage) {
            'use strict';

            var service = this,
                questionsInTestCollection = {},
                parsedQuestionsInTestCollection = {};

            service.assessmentId = '';
            service.syncQuestionsInTestCollectionWithLocalStorage = function() {

                if ((angular.isUndefined(questionsInTestCollection) || _.isEmpty(questionsInTestCollection)) &&
                    !_.isEmpty(webStorage.get('questionsInTestCollection'))) {
                    questionsInTestCollection =
                        JSON.parse(webStorage.get('questionsInTestCollection'));
                } else {
                    webStorage.remove('questionsInTestCollection');
                    webStorage.add('questionsInTestCollection',
                        JSON.stringify(questionsInTestCollection));
                }
            };

            service.getQuestionsInTestCollection = function() {
                return questionsInTestCollection;
            };

            service.setOriginalQuestionsInTestCollectionToLocalStorage = function(result) {
                var originalQuestionsInTestCollection =  _.map(result.questions, function(question) {
                    return {
                        originalQuestionId: question.id || '',
                        sourceQuestionId: question.sourceQuestionId || ''
                    };
                });
                webStorage.remove('originalQuestionsInTestCollection');
                webStorage.add('originalQuestionsInTestCollection', JSON.stringify(originalQuestionsInTestCollection));
            };

            service.isQuestionsInTestCollectionChanged = function() {
                var index = 0,
                    originalQuestionsInTest = JSON.parse(webStorage.get('originalQuestionsInTestCollection')),
                    questionIDsInTestCollection = _.map(questionsInTestCollection.questions, function(question) {
                        return { id: question.id || question.sourceQuestionId };
                    });

                if (originalQuestionsInTest.length !== questionIDsInTestCollection.length) {
                    return true;
                }

                for (index; index < originalQuestionsInTest.length; index++) {
                    if (!(originalQuestionsInTest[index].originalQuestionId === questionIDsInTestCollection[index].id ||
                        originalQuestionsInTest[index].sourceQuestionId === questionIDsInTestCollection[index].id)) {
                        return true;
                    }
                }
            };

            service.setQuestionsInTestCollection = function(result) {
                service.resetQuestionsInTestCollection();

                if (result) {
                    questionsInTestCollection = {
                        questions: result.questions,
                        sourceQuestionBankIds: result.sourceQuestionBankIds
                    };
                    service.syncQuestionsInTestCollectionWithLocalStorage();
                    service.setOriginalQuestionsInTestCollectionToLocalStorage(result);
                }
            };

            service.resetQuestionsInTestCollection = function() {
                questionsInTestCollection = {};
            };

            service.doParseQuestionsInTestCollection = function() {
                service.syncQuestionsInTestCollectionWithLocalStorage();
                parsedQuestionsInTestCollection = {};
                _.each(questionsInTestCollection.sourceQuestionBankIds, function(questionBankId) {
                    var questionList = _.filter(questionsInTestCollection.questions, function(question) {
                            return questionBankId === question.sourceQuestionBankId;
                        }),
                        questions = _.pluck(questionList, 'sourceQuestionId');

                    parsedQuestionsInTestCollection[questionBankId] = {
                        questionBankId : questionBankId,
                        questionIds : questions,
                        allQuestions: null
                    };
                });
                return parsedQuestionsInTestCollection;
            };

            var groupQuestionByBank = function() {
                return _.groupBy(questionsInTestCollection.questions, 'sourceQuestionBankId');
            };

            service.addQuestionsToTest = function(selectedItem, position) {
                var newAddedQuestions = [],
                    questionObj;

                // SelectedItem is a question bank
                if (angular.isUndefined(selectedItem.id)) {
                    var questionsListUnderQBIds = groupQuestionByBank()[selectedItem.questionBankId];

                    if (angular.isUndefined(questionsListUnderQBIds)) {

                        newAddedQuestions = _.map(selectedItem.questions, function(question) {
                            return {
                                id: '',
                                sourceQuestionId: question.id,
                                sourceQuestionBankId: question.parentBankId
                            };
                        });
                        questionsInTestCollection.sourceQuestionBankIds.push(selectedItem.questionBankId);
                    } else {
                        _.each(selectedItem.questions, function(question) {
                            var questionIds =
                                _.pluck(questionsListUnderQBIds, 'sourceQuestionId');
                            if (questionIds.indexOf(question.id) < 0) {
                                questionObj = {
                                    id : '',
                                    sourceQuestionId : question.id,
                                    sourceQuestionBankId : question.parentBankId
                                };
                                newAddedQuestions.push(questionObj);
                            }
                        });
                    }
                    if (angular.isUndefined(position)) {
                        questionsInTestCollection.questions =
                            questionsInTestCollection.questions.concat(newAddedQuestions);
                    } else {
                        Array.prototype.splice.apply(questionsInTestCollection.questions,
                            [position, 0].concat(newAddedQuestions));
                    }
                } else {
                    // SelectedItem is a question
                    questionObj = {
                        id : '',
                        sourceQuestionId :selectedItem.id,
                        sourceQuestionBankId : selectedItem.parentBankId
                    };
                    if (angular.isUndefined(position))  {
                        questionsInTestCollection.questions.push(questionObj);
                    } else {
                        questionsInTestCollection.questions.splice(position, 0, questionObj);
                    }
                    questionsInTestCollection.sourceQuestionBankIds =
                        _.union(questionsInTestCollection.sourceQuestionBankIds, selectedItem.parentBankId);
                }
                service.syncQuestionsInTestCollectionWithLocalStorage();
                return newAddedQuestions.length || 1;
            };

            //TODO: Break up the API for deleting bank and/ or individual question
            service.deleteQuestionsFromTest = function(selectedItem, position) {
                if (angular.isUndefined(selectedItem.id)) {
                    if (angular.isDefined(position)) {
                        var originalPosition = position;

                        _.each(selectedItem.questions, function(question) {
                            if (_.pluck(questionsInTestCollection.questions, 'sourceQuestionId')
                                    .indexOf(question.id) < originalPosition) {
                                position --;
                            }
                        });
                    }

                    questionsInTestCollection.questions =
                        _.filter(questionsInTestCollection.questions, function(question) {
                            return question.sourceQuestionBankId !== selectedItem.questionBankId;
                        });

                    questionsInTestCollection.sourceQuestionBankIds =
                        _.filter(questionsInTestCollection.sourceQuestionBankIds, function(question) {
                            return question !== selectedItem.questionBankId;
                        });

                } else {
                    if (angular.isDefined(position) &&
                        _.pluck(questionsInTestCollection.questions, 'sourceQuestionId')
                            .indexOf(selectedItem.id) < position) {
                        position --;
                    }
                    questionsInTestCollection.questions = _.filter(questionsInTestCollection.questions,
                        function(question) {
                            return question.sourceQuestionId !== selectedItem.id;
                        });
                    var groupQuestionbyBank = groupQuestionByBank()[selectedItem.parentBankId];
                    if (angular.isUndefined(groupQuestionbyBank) || groupQuestionbyBank.length <= 0) {

                        questionsInTestCollection.sourceQuestionBankIds =
                            _.filter(questionsInTestCollection.sourceQuestionBankIds, function(question) {
                                return question !== selectedItem.parentBankId;
                            });
                    }
                }
                service.syncQuestionsInTestCollectionWithLocalStorage();
                return position;
            };

            service.questionsInAssessment = [];
            service.putQuestionsInAssessment = function(shouldUsePageLoader) {
                var assessmentId = service.assessmentId,
                    questions = service.transformQuestionsInTestCollection();

                if (assessmentId && questions && (!_.isEqual(service.questionsInAssessment, questions))) {
                    if (shouldUsePageLoader) {
                        $rootScope.pageLoading();
                    }
                    Assessment.putQuestionsInAssessment(assessmentId, questions).then(function() {
                        if (shouldUsePageLoader) {
                            $rootScope.pageLoaded();
                        }
                    }, function(error) {
                        if (shouldUsePageLoader) {
                            $rootScope.pageLoaded();
                        }
                        $log.error('Failed to load questions for an assessment', error);
                    });
                }
                service.questionsInAssessment = questions;
            };

            service.transformQuestionsInTestCollection = function() {
                return _.map(questionsInTestCollection.questions, function(question) {
                    return {
                        originalQuestionId: question.id || '',
                        sourceQuestionId: question.sourceQuestionId || '',
                        sourceQuestionBankId: question.sourceQuestionBankId || ''
                    };
                });
            };
            return service;
        }
    ]);
