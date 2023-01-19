angular.module('Realize.adaptiveHomework.adaptiveHomeworkCtrl', [
    'rlzComponents.components.i18n',
    'Realize.user.currentUser',
    'Realize.common.alerts'
])
    .controller('AdaptiveHomeworkCtrl', [
        '$scope',
        'lwcI18nFilter',
        '$currentUser',
        '$location',
        'AdaptiveHomeworkData',
        'featureManagementService',
        'locationUtilService',
        function($scope, lwcI18nFilter, $currentUser, $location, AdaptiveHomeworkData, featureManagementService,
            locationUtilService) {
            'use strict';

            var ctrl = this;
            ctrl.currentUser = $currentUser;
            ctrl.adaptiveHomeworkData = AdaptiveHomeworkData;
            $scope.showExternalTocViewer = function() {
                return featureManagementService.isExternalTOCViewerEnabled() &&
                    locationUtilService.isTOCActive();
            };
            $scope.$on('assignmentModal.alert.toggle', function(e, data) {
                $scope.$evalAsync(function() {
                    ctrl.alertDetails = data.alertDetails;
                    ctrl.alertIsSet = data.show;
                });
            });
            ctrl.firstVisit = {
                showAlert: !ctrl.currentUser.getAttribute('adaptiveHomework.info.seen'),

                title: lwcI18nFilter('adaptiveHomework.firstVisit.title'),
                description: lwcI18nFilter('adaptiveHomework.firstVisit.description'),
                instruction: lwcI18nFilter('adaptiveHomework.firstVisit.instruction', undefined, true),

                closeFn: function() {
                    ctrl.currentUser.setAttribute('adaptiveHomework.info.seen', true);
                    ctrl.firstVisit.showAlert = false;
                }
            };
            ctrl.showAssignLink = function() {
                return ctrl.adaptiveHomeworkData.$isAssignable() &&
                    !ctrl.currentUser.isStudent &&
                    $location.path().indexOf('classes') === -1;
            };
            ctrl.back = function(e) {
                e.stopPropagation();

                var path = $location.path(),
                    next;

                next = path.split('/adaptivehomework/')[0];
                $scope.goBack(next, true);
            };
            angular.element('html, body').animate({scrollTop: 0}, 0);
        }
    ]);
