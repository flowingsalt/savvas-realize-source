angular.module('RealizeApp')
    .controller('RemediationCtrl', [
        '$scope',
        '$location',
        '$log',
        'AlertService',
        'AssignmentUtil',
        'Modal',
        'rubricEventTracking',
        'RemediationViewerData',
        'telemetryUtilitiesService',
        'featureManagementService',
        'locationUtilService',
        function($scope, $location, $log, AlertService, AssignmentUtil, Modal, rubricEventTracking,
            RemediationViewerData, telemetryUtilitiesService, featureManagementService, locationUtilService) {
            'use strict';

            $scope.content = RemediationViewerData;
            AssignmentUtil.setRemediationContainerDetails($scope.content);

            $scope.showExternalTocViewer = function() {
                return featureManagementService.isExternalTOCViewerEnabled() &&
                locationUtilService.isTOCActive();
            };

            $scope.excludeSV = function(item) {
                return !item.$isStudentVoice();
            };

            $scope.open = function(item, e) {
                var path;

                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }

                path = [$location.path(), item.id, item.version].join('/');
                $location.path(path);
            };

            $scope.back = function(e) {
                e.stopPropagation();

                // strip off the /content/... part
                var path = $location.path(),
                    next = path.split('/content/')[0];

                $log.log('BACK BUTTON!', path, next);
                $scope.goBack(next, true);
            };

            $scope.showRubric = function(item, event) {

                if (event) {
                    event.stopPropagation();
                }
                postTelemetryEvent(item);
                $location.path([$location.path(), item.id, item.version].join('/'))
                    .search('rubric', 'true');
            };

            var postTelemetryEvent = function(item) {
                var isSearchPage = false;
                if ($scope.productName) {
                    rubricEventTracking.clickOnRubricQuickLink(isSearchPage,
                        $scope.productName,
                        item.externalId,
                        item.title);
                } else {
                    AssignmentUtil.getProgramHierarchy(item, item.id)
                        .then(function(programHierarchy) {
                            $scope.productName =
                                telemetryUtilitiesService.getProgramTitle(programHierarchy);
                            rubricEventTracking.clickOnRubricQuickLink(isSearchPage,
                                $scope.productName,
                                item.externalId,
                                item.title);
                        });
                }
            };

            // event handler to view associated questions for a skill in remediation container
            $scope.viewAssociatedQuestions = function(e, skill) {
                e.stopPropagation();
                $log.log('view questions for skill ', skill);

                var modalScope = $scope.$new();
                modalScope.questions = skill.associatedQuestions;

                modalScope.close = function() {
                    Modal.hideDialog();
                    modalScope.$destroy();
                };
                Modal.showDialog('templates/partials/questions_for_skill_modal.html', modalScope);
            };

            // assignmentModal.alert.toggle is emited from assign modal to show/hide assign success message
            $scope.alertDetails = AlertService.alerts[0];
            $scope.alertIsSet = AlertService.alertIsSet();
            $scope.$on('assignmentModal.alert.toggle', function(e, args) {
                if (args.show) {
                    $scope.alertDetails = AlertService.alerts[0];
                    $scope.alertIsSet = AlertService.alertIsSet();
                } else {
                    $scope.alertIsSet = false;
                }
            });
        }
    ]);
