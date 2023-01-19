angular.module('Realize.discussionPrompt.discussionPromptResolver', [
    'Realize.content.model.contentItem',
    'Realize.discussionPrompt.discussionPromptModel',
    'Realize.constants.contribSource'
])
    .factory('DiscussionPromptResolver', [
        'Content',
        '$q',
        '$route',
        'DiscussionPromptModel',
        'CONTRIBUTOR_SOURCE',
        '$currentUser',
        function(Content, $q, $route, DiscussionPromptModel, CONTRIBUTOR_SOURCE, $currentUser) {
            'use strict';

            return {
                discussionPromptload: function() {
                    // load discussion prompt
                    var discussionPromptLoaded = $q.defer();

                    Content.get({
                        contentId: $route.current.params.itemId,
                        version: $route.current.params.itemVersion,
                    }, true).then(function(data) {
                        DiscussionPromptModel.initialDisPrompt(data);
                        if (!$currentUser.isTeacher && data.contribSource === CONTRIBUTOR_SOURCE.MY_UPLOADS) {
                            return discussionPromptLoaded.reject('Insufficient Privileges!');
                        } else {
                            discussionPromptLoaded.resolve();
                        }

                    });

                    return discussionPromptLoaded.promise;
                }
            };
        }
    ]);
