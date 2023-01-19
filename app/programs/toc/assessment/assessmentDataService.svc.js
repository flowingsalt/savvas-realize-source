angular.module('Realize.assessment.assessmentDataService', [
    'Realize.paths'
])
    .service('Assessment', [
        '$http',
        '$log',
        '$q',
        'PATH',
        function($http, $log, $q, PATH) {
            'use strict';

            var service = {};

            service.isNewTest = false;
            service.getInfo = function(id, version) {
                var promise = $http({
                    url: PATH.REST + '/assessment/info',
                    params: {
                        equellaId: id,
                        equellaVersion: version
                    },
                    method: 'GET'
                })
                .then(function(response) {
                    return response.data;
                }, function(e) {
                    $log.error('Failed to retrieve assessment info', e);
                    return $q.reject('Failed to retrieve assessment info');
                });

                return promise;
            };

            service.getTestSession = function(equellaId, equellaVersion) {
                var promise = $http({
                    url: PATH.REST + '/assessment/session',
                    data: {
                        'equellaId': equellaId,
                        'equellaVersion': equellaVersion
                    },
                    method: 'POST'
                })
                .then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('test session error', err);
                    return $q.reject(err);
                });

                return promise;
            };

            service.getStudentSession = function(itemUUId, itemVersion, createNewSession, userAssignmentId) {
                return service.getStudentSessionBase(itemUUId, itemVersion, createNewSession, false, userAssignmentId);
            };

            service.getStudentSessionFromTeacher = function(itemUUId, itemVersion, userAssignmentId) {
                return service.getStudentSessionBase(itemUUId, itemVersion, false, false, userAssignmentId);
            };

            service.getAdaptiveStudentSession = function(itemUUId, itemVersion, userAssignmentId, assessmentId) {
                return service.getStudentSessionBase(
                    itemUUId, itemVersion, false, false, userAssignmentId, assessmentId);
            };

            service.getStudentSessionBase = function(itemUUId, itemVersion, createNewSession,
                getCompletedSession, userAssignmentId, assessmentId) {
                var restUrl = PATH.REST + '/assessment/session/assignmentApi',
                    params = {
                        itemUUID: itemUUId,
                        itemVersion: itemVersion,
                        createNewSession: createNewSession,
                        getCompletedSession: getCompletedSession,
                        userAssignmentId: userAssignmentId
                    };

                if (assessmentId) {
                    params.assessment_id = assessmentId;
                }

                var promise = $http({
                    url: restUrl,
                    method: 'POST',
                    data: params
                })
                .then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('student session error', err);
                    return $q.reject(err);
                });

                return promise;
            };

            service.getEssayScoresForTeacher = function(sessionId) {
                var opts = {
                    method: 'GET',
                    url: PATH.REST + '/assessment/' + sessionId + '/essayScoringSummary'
                };
                return $http(opts)
                    .then(function(response) {
                        return response;
                    }, function(err) {
                        $log.error('Failed to load essay scores', err);
                        return $q.reject(err);
                    });
            };

            service.updateEquellaTitleAndDescription = function(id, title, desc) {
                var promise = $http({
                    url: PATH.REST + '/assessment/equella/edit/' + id,
                    method: 'POST',
                    data: {
                        assetTitle: title,
                        assetDescription: desc
                    }
                })
                .then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to update title and description', err);
                    return $q.reject(err);
                });

                return promise;
            };

            service.updateEquellaItemTimestamp = function(id) {
                var promise = $http({
                    url: PATH.REST + '/assessment/equella/edit/' + id,
                    method: 'POST'
                })
                .then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to update equella item timestamp', err);
                    return $q.reject(err);
                });

                return promise;
            };

            // Clone the assessment to launch the builder directive
            service.clone = function(id, version, active, customizedItemId) {
                var data = {
                    isDefault: true,
                    isActive: active
                };
                if (angular.isDefined(customizedItemId)) {
                    data.customizedItemId = customizedItemId;
                }
                var promise = $http({
                    url: PATH.REST + '/assessment/customize/' + id + '/' + version,
                    data: data,
                    method: 'POST'
                }).then(function(response) {
                    return response.data;
                }, function(e) {
                    $log.error('failed to clone the assessment for editing', e);
                    return $q.reject(e);
                });

                return promise;
            };

            service.createCustomizeVersion = function(id, version) {
                var url = PATH.REST + '/assessment/v2/customize/' + id + '/' + version;
                return $http.post(url).then(function(response) {
                    return response.data;
                }, function(error) {
                    $log.error('failed to create the assessment for customization', error);
                    return $q.reject(error);
                });
            };

            service.getCustomizedVersionCount = function(id) {
                var promise = $http({
                    url: PATH.REST + '/assessment/item/' + id + '/customizeditemscount',
                    method: 'GET'
                }).then(function(response) {
                    return response.data;
                }, function(error) {
                    $log.error('failed to get the version count', error);
                    return $q.reject(error);
                });

                return promise;
            };

            service.getSummary = function(assessmentSessionId, cacheSummary, includeStandards, programs) {
                var url = PATH.REST + '/assessment/' + assessmentSessionId + '/summary',
                    programNames = [];
                if (angular.isDefined(cacheSummary)) {
                    url = url + '?cacheSummary=' + cacheSummary;
                }
                if (angular.isDefined(includeStandards)) {
                    url = url + (url.indexOf('?') ? '&' : '?') + 'includeStandards=' + includeStandards;
                }
                if (angular.isDefined(programs)) {
                    programNames = programs;
                }

                return $http({
                    url: url,
                    method: 'GET',
                    params: {
                        programs: programNames
                    }
                }).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to retrieve assessment summary', err);
                    return $q.reject(err);
                });
            };

            service.getResult = function(assessmentSessionId) {
                var url = PATH.REST + '/assessment/' + assessmentSessionId + '/results';
                return $http.get(url).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to retrieve assessment result', err);
                    return $q.reject(err);
                });
            };

            service.saveManualMultipartScore = function(assessmentSessionId, questionId, questionMultipartScores) {
                var url = PATH.REST + '/assessments/' + assessmentSessionId + '/questions/' + questionId +
                '/multiparts/scores';

                return $http({
                    url: url,
                    dataType: 'json',
                    method: 'PUT',
                    data: JSON.stringify(questionMultipartScores),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to save score', err);
                    return $q.reject(err);
                });
            };

            //Assessment should be completed for this to work
            service.getSummaryAndResult = function(itemUUId, itemVersion, userAssignmentId) {
                var resultObj = {};
                return service.getStudentSessionFromTeacher(itemUUId, itemVersion, userAssignmentId)
                    .then(function(sessionResponse) {
                        resultObj.sessionId = sessionResponse;
                        return $q.all([
                            service.getSummary(resultObj.sessionId),
                            service.getResult(resultObj.sessionId)
                        ]).then(function(response) {
                            resultObj.summaryResponse = response[0];
                            resultObj.resultResponse = response[1];
                            return resultObj;
                        }, function(err) {
                            $log.error('Failed to get summary and result', err);
                            return $q.reject({
                                type: 'back',
                                errorMessage: 'Unable to retrieve summary/result for test'
                            });
                        });
                    }, function() {
                        return $q.reject({
                            type: 'back',
                            errorMessage: 'Unable to retrieve student session'
                        });
                    });
            };

            service.saveManualScore = function(assessmentSessionId, questionId, score) {
                var url = PATH.REST + '/assessment/' + assessmentSessionId + '/question/' + questionId,
                    params = {score: score};

                return $http({
                    url: url,
                    params: params,
                    method: 'PUT'
                }).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to save score', err);
                    return $q.reject(err);
                });
            };

            service.createAssessment = function(programId, params) {
                var url = PATH.REST + '/my_library/' + programId + '/assessments.json',
                    requestPayload = {
                        'assetTitle': params.title,
                        'assetDescription': params.description,
                        'mastery': params.isMastery,
                        'type': params.testType,
                        'nativeAssessment': params.isNative
                    };

                return $http.post(url, requestPayload).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to create assessment', err);
                    return $q.reject(err);
                });
            };

            service.loadAssessment = function(assessmentId, isEssayPrompt) {
                var opts = {
                    method: 'GET',
                    url: PATH.REST + '/assessment/load/' + assessmentId + '.json',
                    params: {
                        isEssayPrompt: !!isEssayPrompt
                    }
                };
                return $http(opts).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to load assessment', err);
                    return $q.reject(err);
                });
            };

            service.addQuestionsFromBank = function(itemId, assessmentId, bankCollection, insertPosition) {
                var baseUrl = PATH.REST + '/assessments/' + assessmentId + '/questions/questionbanks.json',
                    requestParam = angular.isNumber(insertPosition) ?
                        '?positionAtWhichToInsertQuestions=' + insertPosition : '',
                    requestUrl = baseUrl + requestParam;

                return $http.post(requestUrl, bankCollection).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to add questions from bank', err);
                    return $q.reject(err);
                });
            };

            service.deleteQuestionsFromAssessment = function(assessmentId, bankCollection, isBank) {
                var endPoint, opts;

                if (isBank) {
                    endPoint = PATH.REST + '/assessments/' + assessmentId + '/questionbanks/' + bankCollection;
                } else {
                    endPoint = PATH.REST + '/assessments/' + assessmentId + '/questionbanks/' +
                        bankCollection.parentBankId + '/questions/' + bankCollection.id;
                }

                opts = {
                    method: 'DELETE',
                    url: endPoint
                };

                return $http(opts).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to delete question from assessment', err);
                    return $q.reject(err);
                });
            };

            service.putQuestionsInAssessment = function(assessmentId, questions) {
                var url = PATH.REST + '/assessments/' + assessmentId + '/questions.json';

                questions = questions.filter(function(q, i) {
                    return (q.originalQuestionId !== '' ||
                        (questions.findIndex(function(w) {
                                return w.sourceQuestionId === q.sourceQuestionId;
                            }) === i &&
                            questions.findIndex(function(w) {
                                return w.originalQuestionId === q.sourceQuestionId;
                            }) === -1));
                });

                return $http.put(url, questions).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to putQuestionsInAssessment', err);
                    return $q.reject(err);
                });
            };

            service.createEssayPrompt = function(programId, requestPayload) {
                var url = PATH.REST + '/my_library/' + programId + '/essayPrompt.json';

                return $http.post(url, requestPayload).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to create essay prompt', err);
                    return $q.reject(err);
                });
            };

            service.editEssayPrompt = function(assessmentId, requestPayload) {
                var url = PATH.REST + '/assessment/' + assessmentId + '/essayPrompt';
                return $http.put(url, requestPayload).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('Failed to edit essay prompt', err);
                    return $q.reject(err);
                });
            };

            return service;
        }
    ]);
