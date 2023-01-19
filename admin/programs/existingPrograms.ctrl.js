angular.module('Realize.admin.programs.existingProgramsController', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.admin.programs.programTaxonomyService'
])
    .controller('ExistingProgramsController', [
        '$scope',
        '$log',
        '$location',
        'ProgramTaxonomyService',
        'ProgramData', // resolved
        '$window',
        'PATH',
        function($scope, $log, $location, ProgramTaxonomyService, ProgramData, $window, PATH) {
            'use strict';

            $scope.existingPrograms = ProgramData;
            $scope.thumbnailPath = PATH.THUMBNAILS;

            // Success and error flags
            var resetFlags = function() {
                $scope.viewLoading = true;
                $scope.successReply = {
                    newProgram: false,
                    newEtext: false,
                    editProgram: false,
                    publishProgram: false,
                    deleteProgram: false
                };
                $scope.errorReply = false;
                $scope.errorMessage = '';
            };

            resetFlags();
            $scope.viewLoading = false;

            $scope.subStatus = ProgramTaxonomyService.getSubscriptionStatus();

            if ($scope.subStatus) {
                $scope.subscriptionType = $scope.subStatus.subscriptionType;
                $scope.successReply.newProgram = $scope.subStatus.successReply.newProgram;
                $scope.successReply.newEtext = $scope.subStatus.successReply.newEtext;
                $scope.errorReply = $scope.subStatus.errorReply;
                $scope.errorMessage = $scope.subStatus.errorMessage;
            } else {
                $scope.subscriptionType = $scope.subscriptionType || 'COURSE';
            }

            $scope.back = function(e) {
                e.stopPropagation();

                // to clear subscription data set by add programs/eText page if any
                ProgramTaxonomyService.setSubscriptionStatus();

                $scope.goBack('/admin/patools', true);
            };

            var loadProgramList = function() {
                ProgramTaxonomyService.getAllPrograms()
                    .then(function(programs) {
                        $scope.existingPrograms = programs;
                        $scope.viewLoading = false;
                    });
            };

            var launchErrorAlert = function(errorDetail) {
                $scope.$apply(function() {
                    $scope.errorReply = true;
                    if (errorDetail.responseText) {
                        errorDetail = JSON.parse(errorDetail.responseText);
                        $scope.errorMessage = errorDetail.errorCode + ': ' + errorDetail.errorMessage;
                    } else {
                        $scope.errorMessage = errorDetail;
                    }
                });
            };

            $scope.exportProgram = function(e, subscriptionTitle) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                var encodedTitle = encodeURIComponent(subscriptionTitle.replace(/\\/g, '\\'));

                $window.open(PATH.REST + '/taxonomies/subscription?termFullPath=' + encodedTitle);
            };

            $scope.saveEdit = function(index) {
                if (angular.element('#newName-' + index).val() === '') {
                    return;
                }

                resetFlags();

                ProgramTaxonomyService.editProgram(angular.element('#editProgram-' + index), function(data) {
                    if (data.success === true) {
                        $scope.editProgramTitle = data.title;
                        $scope.successReply.editProgram = true;
                        loadProgramList();
                    } else {
                        launchErrorAlert(data);
                    }
                });

            };

            $scope.publishProgram = function() {
                resetFlags();

                var title = this.prog.title;
                ProgramTaxonomyService.publishProgram(title, function() {
                    // data returned is actually the migration count... which is irrelevant in Pete..?
                    $scope.publishProgramTitle = title;
                    $scope.successReply.publishProgram = true;
                    loadProgramList();
                });
            };

            $scope.removeProgram = function() {
                var pmCount = ProgramTaxonomyService.getPublishMigrationCount(this.prog.title);
                if (pmCount > 0) {
                    launchErrorAlert('This item cannot be removed as there are items to migrate');
                    // launchErrorAlert(adminPrograms.removeProgram.itemsToMigrateError);

                } else {
                    resetFlags();

                    var title = this.prog.title,
                        errorMsg = 'The selected program can\'t be removed since it is being referenced by content.';
                    ProgramTaxonomyService.removeProgramSubscription(title, function(data) {
                        if (data === true) {
                            $scope.deleteProgramTitle = title;
                            $scope.successReply.deleteProgram = true;
                        } else {
                            launchErrorAlert(errorMsg);
                        }
                        loadProgramList();
                    });
                }
            };
        }
    ]);
