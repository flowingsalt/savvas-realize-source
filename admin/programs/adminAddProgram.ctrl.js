angular.module('Realize.admin.programs.addProgramController', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.admin.programs.programTaxonomyService'
])
    .controller('AdminAddProgramController', [
        '$scope',
        '$log',
        '$location',
        'ProgramTaxonomyService',
        'MEDIA_PATH',
        'THUMBNAIL_PATH',
        '$window',
        'REST_PATH',
        '$cacheFactory',
        function($scope, $log, $location, ProgramTaxonomyService, MEDIA_PATH, THUMBNAIL_PATH, $window,
            REST_PATH, $cacheFactory) {
            'use strict';

            $scope.back = function(e) {
                e.stopPropagation();

                $scope.goBack('/admin/patools', true);
            };

            var removeAllProgramsFromCache = function() {
                var allProgramsUrl = [REST_PATH, 'programs'].join('/');
                $cacheFactory.get('$http').remove(allProgramsUrl);
            };

            var reloadProgramList = function() {

                var params = {};
                params.successReply = $scope.successReply;
                params.errorReply = $scope.errorReply;
                params.errorMessage = $scope.errorMessage;
                params.subscriptionType = $scope.uploadType;

                ProgramTaxonomyService.setSubscriptionStatus(params);

                if ($scope.successReply.newProgram) {
                    removeAllProgramsFromCache();
                }

                var next = 'admin/patools/existingprograms';
                $location.path(next);
                $scope.$apply();
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

            // Success and error flags
            var resetFlags = function() {
                $scope.successReply = {
                    newProgram: false,
                    newEtext: false
                };
                $scope.errorReply = false;
                $scope.errorMessage = '';
            };

            $scope.resetForm = function() {
                var form;

                if ($scope.uploadType === 'COURSE') {
                    form = angular.element('#uploadProgramForm');

                    // input type=file doesn't have ng-model....
                    form.each(function() {
                        this.reset();
                    });
                    form.scope().uploadProgramForm.$setPristine();
                    angular.element('#saveProgram').addClass('disabled').attr('disabled', true);
                } else {
                    $scope.previewImgSrc = '';
                    form = angular.element('#uploadEtextForm');
                    var scope = form.scope();
                    $scope.$apply(function() {
                        scope.form = {};
                    });
                    scope.uploadEtextForm.$setPristine();
                }
            };

            // Defaults setup (Default upload = program)
            $scope.uploadType = $scope.uploadType || 'COURSE';
            $scope.inlineCourseTemplate = 'templates/partials/upload_course_form.html';
            $scope.inlineEtextTemplate = 'templates/partials/upload_etext_form.html';
            $scope.previewImgSrc = '';

            resetFlags();

            // Uploads
            $scope.uploadProgram = function() {
                if (angular.element('#file').val() === '') {
                    return;
                }
                resetFlags(); // prepare to reload list...

                ProgramTaxonomyService.uploadProgram(angular.element('#uploadProgramForm'), function(result) {
                    if (result === true) {
                        $scope.successReply.newProgram = true;
                        $scope.resetForm();
                        reloadProgramList();
                    } else {
                        launchErrorAlert(result);
                    }
                }, function(result) {
                    launchErrorAlert(result);
                });
            };

            $scope.uploadEtext = function() {
                if (angular.element('#studentThumbnail').val() === '' || angular.element('#subTitle').val() === '') {
                    return;
                }
                resetFlags();

                ProgramTaxonomyService.uploadEtext(angular.element('#uploadEtextForm'), function(result) {
                    if (result === true) {
                        $scope.successReply.newEtext = true;
                        $scope.resetForm();
                        reloadProgramList();
                    } else {
                        launchErrorAlert(result);
                    }
                }, function(result) {
                    launchErrorAlert(result);
                });
            };

            //Etext-specific
            $scope.previewThumbnail = function(domID) {
                if ($.trim(angular.element(domID).val()) !== '') {
                    $scope.previewImgSrc = THUMBNAIL_PATH + '/' + $.trim($(domID).val());
                }
            };

            //Course-specific
            $scope.downloadTemplate = function() {
                $window.open(MEDIA_PATH + '/downloads/course_subscription.csv');
            };

            $scope.setFile = function(element) {
                // Due to https://github.com/angular/angular.js/issues/1375
                // Resorting to g'old jquery to enable button
                if (element.files.length > 0) {
                    angular.element('#saveProgram').removeClass('disabled')
                        .attr('disabled', null);
                } else {
                    angular.element('#saveProgram').addClass('disabled')
                        .attr('disabled', true);
                }
            };

        }
    ]);
