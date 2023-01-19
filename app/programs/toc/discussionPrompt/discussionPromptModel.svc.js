angular.module('Realize.discussionPrompt.discussionPromptModel', [])
    .service('DiscussionPromptModel', [

        function() {
            'use strict';

            var service = this,
                discussionPrompt = '';

            service.initialDisPrompt = function(data) {
                discussionPrompt = data;
            };

            service.getDisPrompt = function() {
                return discussionPrompt;
            };
            return service;
        }
    ]);
