angular.module('Realize.student.profile', [
    'Realize.classRosterThemes.constants',
    'Realize.user.currentUser',
])
    .controller('StudentProfileCtrl', [
        '$sce',
        '$q',
        '$scope',
        '$location',
        '$anchorScroll',
        '$filter',
        'PATH',
        '$http',
        'Modal',
        '$log',
        '$rootScope',
        'User',
        'lwcI18nFilter',
        'RealizeHelpers',
        'UnsavedChangesModal',
        'BrowserInfo',
        '$window',
        'EARLY_LEARNER_CONSTANTS',
        '$currentUser',
        'featureManagementService',
        'ProfileUserMapping',
        'googleClassroomService',
        function($sce, $q, $scope, $location, $anchorScroll, $filter, PATH, $http, Modal, $log, $rootScope, User,
                 lwcI18nFilter, RealizeHelpers, UnsavedChangesModal, BrowserInfo, $window, EARLY_LEARNER_CONSTANTS,
                 $currentUser, featureManagementService, ProfileUserMapping, googleClassroomService) {
            'use strict';

            $scope.showGoogleClassroomIntegration = function() {
                return $currentUser.isStudent && featureManagementService.isGoogleClassroomEnabledForStudent() &&
                featureManagementService.isGoogleClassroomEnabled() && $currentUser.getAttribute('isAutoRostered') &&
                $currentUser.getAttribute('isClassLinkingEnabled');
            };

            $scope.googleClassroomText = {
                yourGoogleClassroomAccount: lwcI18nFilter('studentHome.yourGoogleClassroomAccount'),
                connectedToRealize: lwcI18nFilter('studentHome.connectedToRealize'),
            };

            $scope.getUserLinkedStatus = function() {
                if (ProfileUserMapping && ProfileUserMapping.data) {
                    var userMapping = ProfileUserMapping.data.userMapping;
                    var isGoogleClassroomEnabled = featureManagementService.isGoogleClassroomEnabledForStudent() &&
                        featureManagementService.isGoogleClassroomEnabled();
                    if (isGoogleClassroomEnabled && userMapping) {
                        $scope.isUserLinked = userMapping.hasProvidedConsent && userMapping.hasValidToken;
                        $scope.googleClassroomEmailAddress = userMapping.email || '';
                    }
                }
            };

            $scope.getUserLinkedStatus();

            $scope.isActiveStep = function(index) {
                if (!$scope.stepSpy || index >= $scope.stepSpy.length) {
                    // if we haven't scrolled yet, select first one
                    return index === 0;
                }

                var top = $scope.stepSpy[index].top;
                var isScrolledToBottom = RealizeHelpers.isElementScrolledToBottom($('#steps'), 10);

                // get size of this step and the next
                if (index === $scope.stepSpy.length - 1) { // last one
                    //$log.log('step index',index, 'top', top, 'size', size * -1);
                    return top <= 57 || isScrolledToBottom;
                } else if (!isScrolledToBottom) {
                    var size = $scope.stepSpy[index + 1].top - top;
                    //$log.log('step index',index, 'top', top, 'size', size * -1);
                    return top <= (index === 0 ? 0 : 57) && top >= (size - 57) * -1;
                }

                return false;
            };

            $scope.firstName  = $scope.currentUser.firstName;
            $scope.middleName = $scope.currentUser.getAttribute('profile.middleName');
            $scope.lastName   = $scope.currentUser.lastName;
            $scope.email      = $scope.currentUser.rumbaEmail;
            $scope.facingName = $scope.currentUser.getAttribute('profile.displayName');
            $scope.username   = $scope.currentUser.userName;
            $scope.selectedBG = $scope.currentUser.getAttribute('home.background') || 'teacher1';

            // there are currently 18 icons
            $scope.profileIcons = [];

            // default (store only first part so that we can display retina later)
            $scope.selectedProfileIcon = $scope.currentUser.getAttribute('profile.avatar') || '01_student';
            var profilePath = PATH.IMAGES + '/profile_icons/'; // todo: make this a constant?
            var bgBasePath = PATH.SHARED_THUMBNAILS + '/homepage/settings/';

            var Icon = function(name, basePath, filename, ext) {
                this.name = name;
                this.basePath = basePath;
                this.filename = filename;
                this.fileExt = ext;
            };
            Icon.prototype.getPath = function() {
                return [this.basePath, this.filename, BrowserInfo.isHDDisplay ? '@2x' : '', this.fileExt].join('');
            };

            Icon.prototype.getName = function() {
                return this.name;
            };

            // profile icons
            var i, num;
            for (i = 1; i < 19; i++) {
                // they have double digit names....
                num = i.toString();
                if (num.length < 2) {
                    num = '0' + num;
                }
                $scope.profileIcons.push(new Icon(num + '_student', profilePath, num + '_student', '.png'));
            }

            $scope.bgImages = [];
            // background thumbs
            var t;
            for (t = 1; t < 13; t++) {
                $scope.bgImages.push(new Icon('teacher' + t, bgBasePath, 'teacher' + t, '.png'));
            }

            $scope.chooseProfileIcon = function(e, icon) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                $scope.selectedProfileIcon = icon.name;
            };

            $scope.scrollTo = function(id) {
                $location.hash(id);
                $anchorScroll();

                /**
                 * jQuery and IE8 combination does not trigger
                 * the scroll event which is what triggers a $digest to update the class
                 */
                if (BrowserInfo.browser.isIE && BrowserInfo.browser.version === 8) {
                    $('#steps').scroll();
                }
            };

            $scope.setBackground = function(e, bg) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    $scope.selectedBG = bg;
                }
            };

            $scope.finish = function() {
                if ($scope.wizardForm.$valid) {
                    var currentUser = $scope.editUser,
                        locale = $scope.selectedLanguage === 'Spanish' ? 'es' : 'en',
                        attributes = {
                            'profile.avatar': $scope.selectedProfileIcon,
                            'home.background': $scope.selectedBG,
                            'profile.locale': locale,
                            'profile.wizard': 'complete'
                        },
                        theme = currentUser.userAttributes['profile.learningExperience'] ||
                            EARLY_LEARNER_CONSTANTS.THEME_STANDARD,
                        doNotPersistAttrFlag = false;
                    $scope.assignmentUrl = currentUser.userAttributes.googleAssignmentRedirectURL;

                    User.updateCurrentUserAttributes(attributes)
                        .then(function() {
                            var suppressBroadcast = false;
                            if (theme === EARLY_LEARNER_CONSTANTS.THEME_EARLY_LEARNER) {
                                if ($scope.assignmentUrl) {
                                    $window.location = $scope.assignmentUrl;
                                } else {
                                    $window.location.reload(true);
                                }
                            } else {
                                $scope.currentUser.$setAvatar($scope.selectedProfileIcon, doNotPersistAttrFlag);
                                if ($scope.wizardForm.languageDropdownInput.$dirty) {
                                    suppressBroadcast = true;
                                    $scope.currentUser.$setLocale(locale, doNotPersistAttrFlag, suppressBroadcast);
                                    // using $window.location to cause a full page refresh to show new language
                                    if ($scope.assignmentUrl) {
                                        $window.location = $scope.assignmentUrl;
                                    } else {
                                        $window.location = PATH.ROOT;
                                    }
                                    return;
                                }
                                $location.hash('');
                                if ($scope.assignmentUrl) {
                                    $scope.assignmentUrl = $scope.assignmentUrl.split('/community')[1];
                                    $location.path($scope.assignmentUrl);
                                } else {
                                    $location.path('/dashboard');
                                }
                            }
                        });
                }
            };

            // make a copy of the current user for editing "undo"
            $scope.editUser = angular.copy($scope.currentUser);

            $scope.selectedLanguage = 'English';
            var curLocale = $scope.editUser.getAttribute('profile.locale');
            if (curLocale === 'es') {
                $scope.selectedLanguage = 'Spanish';
            }

            $scope.showPreviewBG = function() {
                var shell;
                if (curLocale === 'es') {
                    shell = '<img src="' + PATH.IMAGES + '/homepage/preview/home_preview_student_spanish.png' +
                        '" class="previewBG" />';
                } else {
                    shell = '<img src="' + PATH.IMAGES + '/homepage/preview/home_preview_student.png' +
                        '" class="previewBG" />';
                }

                var preview = '<img src="' + PATH.SHARED_THUMBNAILS + '/homepage/preview/' + $scope.selectedBG +
                    (BrowserInfo.isHDDisplay ? '@2x.jpg' : '.jpg') + '" class="previewSM" />';

                var modalScope = $scope.$new(true);
                modalScope.dialogId = 'homeBGPreview';
                modalScope.title = lwcI18nFilter('teacherProfile.step5.preview.title');
                modalScope.body = $sce.trustAsHtml(preview + shell);
                modalScope.closeBtnClickHandler = function() { Modal.hideDialog(); modalScope.$destroy(); };
                modalScope.buttons = [{
                    title: 'OK',
                    isDefault: true,
                    clickHandler: function() { Modal.hideDialog(); modalScope.$destroy(); }
                }];
                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            };

            var unsavedChangesModal = new UnsavedChangesModal(function() {
                return $scope.save();
            });

            // main nav watch
            $scope.$on('$locationChangeStart', function(event) {
                if ($scope.studentSettingsForm && $scope.studentSettingsForm.$dirty) {
                    unsavedChangesModal.showDialog(event).then(null , function() {
                        $scope.pageLoaded();
                    });
                }
            });

            $scope.getGoogleClassroomBannerText = function() {
                var googleClassroomConnectedBannerText = $scope.googleClassroomText.yourGoogleClassroomAccount +
                    '(' + $scope.googleClassroomEmailAddress + ') ' + $scope.googleClassroomText.connectedToRealize;
                return googleClassroomConnectedBannerText;
            };

            $scope.redirectToClassSyncWebApp = function() {
                googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl(), '', '');
            };

            $scope.save = function(success, fail) {
                success = success || angular.noop;
                fail = fail || angular.noop;
                $scope.settingsError = false;

                if ($scope.studentSettingsForm && $scope.studentSettingsForm.$valid) {
                    // save edit user, copy over to real user
                    return $scope.editUser.$save().then(function() {
                        var locale = $scope.selectedLanguage === 'Spanish' ? 'es' : 'en';
                        return User.updateCurrentUserAttributes({
                            'home.background': $scope.selectedBG
                        }).then(function() {
                            return $scope.currentUser.$setAvatar($scope.selectedProfileIcon);
                        }).then(function() {
                            $scope.editUser.$setLocale(locale);
                            angular.extend($rootScope.currentUser, $scope.editUser);
                            return;
                        }).then(function() {
                            // cancel will in effect reset the form now
                            $scope.cancel(); // maybe rename to reset...
                            $scope.settingsSuccess = true;
                            success();
                        });
                    }, function() {
                        // error
                        return;
                    });
                } else {
                    $scope.settingsError = true;
                    $scope.isInProgress = false;
                    fail();
                }
            };

            $scope.cancel = function() {
                // reset form to pristine
                $scope.studentSettingsForm.$setPristine();

                $scope.editUser = angular.copy($scope.currentUser);

                $scope.selectedLanguage = 'English';
                var curLocale = $scope.editUser.getAttribute('profile.locale');
                if (curLocale === 'es') {
                    $scope.selectedLanguage = 'Spanish';
                }

                // reset about me
                $scope.selectedProfileIcon = $scope.editUser.getAttribute('profile.avatar') || '01_teacher';
                $scope.selectedBG = $scope.editUser.getAttribute('home.background') || 'teacher1';

                // reset button
                $scope.isInProgress = false;
                $scope.settingsError = false;
            };

            $scope.isEarlyLearnerTheme = function() {
                return $scope.editUser.userAttributes['profile.learningExperience'] ===
                    EARLY_LEARNER_CONSTANTS.THEME_EARLY_LEARNER;
            };

            // focus on content that allows page scrolling via arrow keys
            $scope.$on('$viewContentLoaded', function() {
                angular.element('#step1 .scrollDivider a').focus();
            });
        }
    ]);
