angular.module('Realize.admin.messages.adminMessagesEditorController', [
    'rlzComponents.components.i18n',
    'realize-lib.core.services.filesystem',
    'ModalServices'
])
    .controller('AdminMessagesEditorController', [
        '$scope',
        '$q',
        'Messages',
        'fileSystem',
        '$log',
        '$window',
        'Modal',
        function($scope, $q, Messages, fileSystem, $log, $window, Modal) {
            'use strict';

            $scope.selectedLanguage = 'English';

            // link to method for usage in template
            $scope.getMessage = Messages.getMessage;

            $scope.messages = {};
            // load the codes, don't update the site
            var curLocale = $scope.currentUser.getAttribute('profile.locale');
            var curOverride = $scope.currentUser.getAttribute('admin.localeOverride');
            $q.when(Messages.load(curLocale, curOverride, false))
                .then(function(codes) {
                    $scope.messages = angular.copy(codes);
                });

            // reload local msgs
            $scope.$watch('selectedLanguage', function(lang) {
                var locale = lang === 'Spanish' ? 'es' : 'en';

                // load new codes, don't update teh site
                $q.when(Messages.load(locale, $scope.currentUser.getAttribute('admin.localeOverride'), false))
                    .then(function(codes) {
                        $scope.messages = angular.copy(codes);
                    });
            });

            $scope.save = function() {
                var locale = $scope.selectedLanguage === 'Spanish' ? 'es' : 'en';

                return fileSystem.writeJSON('messages_' + locale + '.json', angular.toJson($scope.messages))
                    .then(function(url) {
                        $log.log('successfully saved', url);
                        // open the file to save to normal hard drive
                        $scope.fileUrl = url;
                        $scope.currentUser.setAttribute('admin.localeOverride', url);

                        return url;
                    });
            };

            $scope.togglePreview = function() {
                var mode = $scope.currentUser.getAttribute('admin.previewMode');
                mode = !mode;
                $scope.currentUser.setAttribute('admin.previewMode', mode);

                if (mode) {
                    // make sure we save the file
                    $scope.save()
                        // set override to file
                        .then(function(url) {
                            var locale = $scope.selectedLanguage === 'Spanish' ? 'es' : 'en';
                            $scope.currentUser.setAttribute('admin.localeOverride', url)
                                .then(function() {
                                    Messages.load(locale, url);
                                });
                        });
                } else {
                    // turning it off
                    Messages.load($scope.currentUser.getAttribute('profile.locale'));
                }
            };

            // delete local versions
            $scope.clearLocal = function() {
                var myButtons = {};

                myButtons[Modal.BUTTONS.OK] = {
                    title: Messages.getMessage('global.action.button.ok'),
                    isDefault: false,
                    handler: function() {
                        // we can't do preview or override with no local files
                        $scope.currentUser.setAttribute('admin.previewMode', false);
                        $scope.currentUser.setAttribute('admin.localeOverride', false);

                        // reload system defaults into editor
                        Messages.load($scope.currentUser.getAttribute('profile.locale'), false, false)
                            .then(function(codes) {
                                $scope.messages = angular.copy(codes);
                            });

                        // actually delete the files
                        fileSystem.deleteFile('/messages_en.json')
                            .then(function(result) {
                                $log.log('delete english success', result);
                            }, function(err) {
                                $log.log('delete error', err);
                            });

                        fileSystem.deleteFile('/messages_es.json')
                            .then(function(result) {
                                $log.log('delete spanish success', result);
                            }, function(err) {
                                $log.log('delete error', err);
                            });
                    }
                };
                myButtons[Modal.BUTTONS.CANCEL] = {
                    title: Messages.getMessage('adminTools.messages.deleteAction.modal.buttons.cancel'),
                    isDefault: true,
                    handler: angular.noop
                };

                Modal.simpleDialog(Messages.getMessage('adminTools.messages.deleteAction.modal.header'),
                    Messages.getMessage('adminTools.messages.deleteAction.modal.body'), myButtons, {
                        id: 'deleteConfirmationModal'
                    });
            };
        }
    ]);
