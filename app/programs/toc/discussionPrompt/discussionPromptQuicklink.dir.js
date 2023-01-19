angular.module('Realize.Prompt.discussionPromptQuicklink', [
    'Realize.paths',
    'Realize.analytics',
    'Realize.discussionPrompt.discussionPromptModel',
    'Realize.constants.contribSource'
])
    .controller('DiscussionPromptQuicklinkCtrl', [
        'DiscussionPromptModel',
        '$scope',
        '$currentUser',
        'CONTRIBUTOR_SOURCE',
        '$location',
        function(DiscussionPromptModel, $scope, $currentUser, CONTRIBUTOR_SOURCE, $location) {
            'use strict';
            var ctrl = this;

            $scope.discussionPrompt = DiscussionPromptModel.getDisPrompt();

            ctrl.canAssign = $scope.discussionPrompt.$isAssignable() && !$currentUser.isStudent;

            ctrl.isTeacherPrompt = function() {
                return $scope.discussionPrompt.contribSource === CONTRIBUTOR_SOURCE.MY_UPLOADS;
            };
            ctrl.showRemoveLink = function() {
                return ctrl.isTeacherPrompt() && $location.path().indexOf('classes') >= 0;
            };

            $scope.editPrompt = function() {
                $scope.$emit('prompt.mode.editing', 'edit');
            };
        }
    ])
    .directive('discussionPromptQuicklink', [
        'PATH',
        function(PATH) {
            'use strict';
            return {
                templateUrl: PATH.TEMPLATE_ROOT +
                    '/app/programs/toc/discussionPrompt/discussionPromptQuicklink.dir.html',
                controller: 'DiscussionPromptQuicklinkCtrl',
                controllerAs: 'discussionPromptQuicklinkCtrl',
                link: function($scope) {
                    $scope.removePrompt = function(event) {
                        if (event) {
                            event.stopPropagation();
                        }
                        $scope.$emit('promptdetails.action.remove');
                    };
                }
            };
        }
    ]);
