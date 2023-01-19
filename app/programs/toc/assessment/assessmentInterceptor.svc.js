angular.module('Realize.assessment.assessmentInterceptor', [])
    .factory('AssessmentInterceptor', function assessmentInterceptorProvider() {
        'use strict';

        var assessmentInterceptor = {},
            allowedUrlPattern = [
                '/essayPrompt',
                '/questionbanks.json',
                '/questions.json',
                '/assessments.json'
            ],
            isAllowedUrl = function(url) {
                for (var i = 0; i < allowedUrlPattern.length; i++) {
                    if (url.indexOf(allowedUrlPattern[i]) > -1) {
                        return true;
                    }
                }
                return false;
            },
            jsonStringifyTransformReq = function(data) {
                return JSON.stringify(data);
            };

        assessmentInterceptor.request = function(config) {
            if (isAllowedUrl(config.url)) {
                config.headers['Content-Type'] = 'application/json';
                config.transformRequest = jsonStringifyTransformReq;
            }
            return config;
        };

        return assessmentInterceptor;

    });

