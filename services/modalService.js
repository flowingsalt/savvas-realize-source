/* Modal Dialog Service - handles the creation and destruction of modal dialogs */
angular.module('ModalServices')
    .factory('ModalGet', [
        '$http',
        '$templateCache',
        '$q',
        '$log',
        function($http, $templateCache, $q, $log) {
            'use strict';

            return function(dialogUrl) {
                var promise = $http.get(dialogUrl, {
                    cache : $templateCache
                }).then(function(response) {
                    $log.log('modal http', dialogUrl);
                    return response.data;
                }, function(err) {
                    $log.warn('[Modal] getModalHtml ERROR: ', err);
                    return $q.reject(err);
                });

                return promise;
            };
        }
    ])

    .factory('Modal', [
        'ModalGet',
        '$compile',
        '$log',
        '$timeout',
        '$location',
        'Messages',
        '$q',
        '$rootScope',
        '$window',
        'KEY_CODES',
        'googleClassroomService',
        function(getModalHtml, $compile, $log, $timeout, $location, Messages, $q, $rootScope, $window, KEY_CODES,
                 googleClassroomService) {
            'use strict';

            // these make the modal dialog a singleton
            var dialog = null, target = angular.element('.modalRegion');
            // preload the progress dialog...
            getModalHtml('templates/partials/modal_progress.html');

            var destroyDialog = function() {
                // $log.log('destroyDialog: ', dialog);
                var deferred = $q.defer(),
                    $ = angular.element;

                if (angular.isElement(dialog)) {

                    // Hide and remove from DOM
                    dialog.addClass('hide');

                    $timeout(
                        function() {
                            dialog.modal('hide');
                            target.empty();
                            deferred.resolve();
                            angular.element('.modal-backdrop').remove();
                        },
                        400
                    );

                    // TODO: this probably needs to be strengthened and moved to a manageModality function
                    // Restore keyboard access to links on the page

                    // restore global background items

                    $('#skipNav a').attr('tabindex', 1);
                    $('#globalNav .section a').attr('tabindex', 2);
                    $('#keywordSearchDropdown').attr('tabindex', 3);
                    $('#usernameDropdown').attr('tabindex', 5);
                    $('#globalSearch #SearchTextInput, #globalSearch button').attr('tabindex', 4);
                    $('#sectionNav a').removeAttr('tabindex', -1);
                    $('#footer a').removeAttr('tabindex', -1);
                    // restore dynamic background items
                    $('#sectionBody a, #sectionBody area, #sectionBody button, #sectionBody input, ' +
                        '#sectionBody object, #sectionBody select, #sectionBody textarea').removeAttr('tabindex', -1);
                    $('#skipTarget, div.customCheckbox input[type=\'checkbox\']').attr('tabindex', -1);
                    $('body').children().removeAttr('aria-hidden', 'true');
                    $('.modalRegion').removeAttr('aria-hidden', 'false');
                    //$('.modal-backdrop').removeAttr('tabindex', -1);
                    $('.modal').off('hide');

                } else {
                    deferred.resolve();
                }

                return deferred.promise;
            };

            var showDialog = function(dialogUrl, scope) {
                return getModalHtml(dialogUrl).then(function(html) {
                    // Strip the comment blocks from the HTML, otherwise $(html) generates an array and
                    //    later a modal-backdrop for each. (RGHT-22901)
                    html = html.replace(/<!--[\s\S]*?-->/g, '');

                    return destroyDialog().then(function() {
                        var shownHandler, hideHandler, hiddenHandler, keydownHandler;
                        // Attach loaded template to the DOM
                        // trimming is necessary due to some of the html templates start with whitespace.
                        // jQuery 1.9 gives parsing error if html is not starting with <
                        dialog = $($.trim(html));
                        target.hide().append(dialog);

                        // here we add Messages service to every scope
                        scope.getMessage = Messages.getMessage;

                        shownHandler = function() {
                            // compile the template in the provided scope
                            $compile(dialog)(scope);

                            $timeout(function() {
                                //TEMP HACK for 2.1 assignment modal issue
                                if (dialog.attr('id') === 'assignmentModal' &&
                                    dialog.find('.modal-header h1').length === 0) {

                                    $log.warn('AssignmentModal\'s scope is destoryed, not displaying modal');
                                    destroyDialog();
                                } else {
                                    //dialog.removeClass('hide');

                                    // add to our holder
                                    target.show();
                                }
                                dialog.find('[auto-focus=\'\']:visible').focus();
                            }, 10);

                            //custom ESC handler for closing modal
                            keydownHandler = function(event) {
                                if (event.which === KEY_CODES.ESC) {
                                    destroyDialog();
                                    scope.$emit('modal:close');
                                }
                            };

                            $(dialog).on('keydown', keydownHandler);

                            scope.$emit('modal:shown');
                        };
                        // register event before dialog call, as it will be fired during dialog call
                        dialog.on('shown', shownHandler);

                        hideHandler = function() {
                            scope.$emit('modal:hidden');
                        };
                        dialog.on('hide', hideHandler);

                        // initialize the modal before passing it to angularjs so that the scope variables
                        // in the template get resolved
                        // e.g template is simple_dialog.jsp
                        // see more details in this task -
                        // https://rally1.rallydev.com/#/7278330890d/detail/task/10365036502

                        dialog.modal({
                            backdrop : 'static',
                            keyboard: false //disable default ESC handler
                        });

                        // TODO: this probably needs to be strengthened and moved to a manageModality
                        // function
                        // Prevent keyboard access to links in background by removing them from the tabindex
                        // array

                        // remove global background items
                        $('#skipNav a').attr('tabindex', -1);
                        $('#globalNav .section a').attr('tabindex', -1);
                        $('#usernameDropdown').attr('tabindex', -1);
                        $('#keywordSearchDropdown').attr('tabindex', -1);
                        $('#globalSearch #SearchTextInput, #globalSearch button').attr('tabindex', -1);
                        $('#sectionNav a').attr('tabindex', -1);
                        $('#footer a').attr('tabindex', -1);
                        // remove dynamic background items
                        $('#sectionBody a, #sectionBody area, #sectionBody button, #sectionBody input, ' +
                            '#sectionBody object, #sectionBody select, #sectionBody textarea, ' +
                            '#sectionBody a').attr('tabindex', -1);
                        $('body').children().attr('aria-hidden', 'true');
                        $('.modalRegion').attr('aria-hidden', 'false');
                        $('.modal-backdrop').attr('tabindex', -1);
                        // close options dropdown in tier thumbnail view
                        $('.quick-list-dropdown .open').removeClass('open');

                        hiddenHandler = function() {
                            scope.$broadcast('modal.hidden');
                        };
                        $(dialog).on('hidden', hiddenHandler);

                        scope.$on('$destroy', function() {
                            dialog.off('shown', shownHandler);
                            dialog.off('hide', hideHandler);
                            $(dialog).off('hidden', hiddenHandler);
                            if (keydownHandler) {
                                $(dialog).off('keydown', keydownHandler);
                            }
                        });

                        // the autoFocus directive did not have the desired effect. So, doing this hack.

                    }, function(err) {
                        $log.error('error destroying dialog', err);
                        return $q.reject(err);
                    });
                }, function(err) {
                    $log.error('error building dialog', err);
                    return $q.reject(err);
                });
            };

            /**
             * Removes modal dialog from DOM and destroys it
             */
            var hideDialog = function() {
                return destroyDialog();
            };

            /**
             * Creates a progress modal and returns the scope of the modal
             */
            var progressDialog = function(scope, progressObject) {
                angular.forEach(progressObject, function(value, property) {
                    scope[property] = value;
                });

                // default: start at 0 an increment by 10% every 100 ms
                if (angular.isUndefined(scope.setProgress)) {
                    $log.log('[[ WARNING ]] progress-modal expecting a setProgress method, none found');
                    scope.setProgress = function(percent) {
                        scope.progressPercent = percent;
                    };
                }

                if (angular.isUndefined(scope.progressPercent)) {
                    scope.progressPercent = 0;
                }

                if (angular.isUndefined(scope.progressIncrement)) {
                    scope.progressIncrement = 10;
                }

                var timeout, fakeProgressPromise;
                scope.fakeProgress = function(desiredTimeout) {
                    timeout = desiredTimeout || 100;
                    $timeout(function fakeProgress() {
                        if (100 - (scope.progressPercent + scope.progressIncrement) > 0) {
                            scope.setProgress(scope.progressPercent + scope.progressIncrement);
                            fakeProgressPromise = $timeout(fakeProgress, timeout);
                        }
                    }, timeout);
                };

                scope.progressComplete = function(timeout) {
                    if (fakeProgressPromise) { $timeout.cancel(fakeProgressPromise); }
                    timeout = timeout || 1000;
                    scope.setProgress(100);
                    return {
                        then : function(callback) {
                            $timeout(callback, timeout);
                        }
                    };
                };

                var promise = showDialog('templates/partials/modal_progress.html', scope);
                promise.then(function() {
                    // successfully launched modal
                    return scope;
                }, function(err) {
                    $log.error('error building progress dialog', err);
                    return $q.reject(err);
                });

                // create pseudo promise for scoped actions after promise is fulfilled
                scope.then = function(fn) {
                    promise.then(fn);
                    return scope;
                };

                scope.close = function() {
                    hideDialog();
                };

                return scope;
            };

            var toolDialog = function(scope, selectedTool, titleFromMessageCode, eventParent) {
                // avoid changes to the original item
                selectedTool = angular.copy(selectedTool);
                selectedTool.pages = selectedTool.previews || [];

                if (titleFromMessageCode) {
                    selectedTool.title = Messages.getMessage(titleFromMessageCode);
                }

                var modalScope = scope.$new(true);
                modalScope.selectedTool = selectedTool;
                modalScope.currentPage = 1;
                modalScope.docViewerUrl = scope.toolsDocViewerUrl;
                modalScope.showToolsPreviewer = true;
                modalScope.close = function() {
                    hideDialog().then(function() {
                        $timeout(
                            function() {
                                if (eventParent) {
                                    eventParent.focus();
                                }
                            }
                        );
                        modalScope.$destroy();
                    });
                };
                modalScope.download = function(e, item) {
                    e.stopPropagation();
                    e.preventDefault();

                    if (item.restrictedDownloadContent.search(/download/gi) >= 0) {
                        $window.open(item.attachments[0].downloadURL, '_blank');
                    }
                };

                return showDialog('templates/partials/toolPopupModal.html', modalScope);
            };

            // valid button type enum
            var BUTTONS = {
                OK : 'OK',
                CANCEL : 'CANCEL'
            };

            var showSimpleDialog = function(title, body, buttons, options) {
                // todo: merge in options? right now just id is used...
                options = options || {};

                var modalScope = $rootScope.$new(true),
                    suicide = function() {
                        hideDialog().then(function() {
                            modalScope.$destroy();
                        });
                    },
                    modalResult = $q.defer(),
                    promise = modalResult.promise,
                    closeOK = false;

                modalScope.buttons = [];

                // simple dialogs can only have 2 types of buttons, OK and/or Cancel
                // {title: ..., type: Modal.BUTTONS.OK, handler: fn}
                if (angular.isDefined(buttons) && angular.isObject(buttons)) {
                    var ok = buttons[BUTTONS.OK], cancel = buttons[BUTTONS.CANCEL];

                    if (cancel && ok) {
                        promise = promise.then(ok.handler, cancel.handler);
                    } else if (cancel) {
                        promise = promise.then(null, cancel.handler);
                    } else if (ok) {
                        closeOK = true;
                        promise = promise.then(ok.handler, null);
                    }

                    if (cancel) {
                        modalScope.buttons.push({
                            buttonType: 'cancel',
                            title : cancel.title ? Messages.getMessageOrDefault(cancel.title, cancel.title) :
                                Messages.getMessageOrDefault('Cancel', 'Cancel'),
                            isDefault : !!cancel.isDefault,
                            clickHandler : function() {
                                modalResult.reject();
                            }
                        });
                    }

                    if (ok) {
                        modalScope.buttons.push({
                            buttonType: 'ok',
                            title : ok.title ? Messages.getMessageOrDefault(ok.title, ok.title) :
                                Messages.getMessageOrDefault('Ok', 'Ok'),
                            isDefault : !!ok.isDefault,
                            clickHandler : function() {
                                modalResult.resolve();
                            }
                        });
                    }
                } else {
                    // default to having OK
                    closeOK = true;
                    modalScope.buttons.push({
                        buttonType: 'ok',
                        title : Messages.getMessageOrDefault('OK', 'OK'),
                        isDefault : true,
                        clickHandler : function() {
                            modalResult.resolve();
                        }
                    });
                }

                // always kill the modal in the end
                promise.then(suicide, suicide);

                if (options.id) {
                    modalScope.dialogId = options.id;
                }
                modalScope.title = Messages.getMessageOrDefault(title, title);
                modalScope.body = Messages.getMessageOrDefault(body, body);
                modalScope.closeBtnClickHandler = closeOK ? modalResult.resolve : modalResult.reject;

                $log.debug('launching simple dialog: ', options, 'scope: ', modalScope);

                return showDialog('templates/partials/simpleDialog.html', modalScope);
            };

            var redirectToClassSyncWebapp = function() {
                googleClassroomService.setGoogleConsentAsked(true);
                $location.search('googleConsentAsked', 'true');
                googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl().toString(), '', '');
            };

            var cancelGoogleDialog = function() {
                googleClassroomService.setGoogleConsentAsked(true);
                return destroyDialog();
            };

            // final factory object
            return {
                showDialog : showDialog,
                hideDialog : hideDialog,
                progressDialog : progressDialog,
                toolDialog : toolDialog,
                simpleDialog : showSimpleDialog,
                cancelGoogleDialog: cancelGoogleDialog,
                redirectToClassSyncWebapp: redirectToClassSyncWebapp,
                BUTTONS : BUTTONS
            };
        }
    ])

    .factory('SessionTimeoutModal', ['$rootScope', 'Modal', '$window', 'ROOT_PATH', 'webStorage',
        function($rootScope, Modal, $window, rootPath, webStorage) {
            'use strict';

            var template = 'templates/partials/session_timeout_dialog.html';

            var setTemplate = function(newTemplate) {
                template = newTemplate;
            };

            var onHidden = function() {
                $window.location.href = rootPath + '/j_spring_security_logout';
            };

            var setOnHidden = function(newOnHiddenFn) {
                onHidden = newOnHiddenFn;
            };

            var showSessionTimeoutModal = function() {
                var scope = $rootScope.$new();

                scope.close = function($event) {
                    $event.stopPropagation();
                    $event.preventDefault();
                    webStorage.clear();
                    Modal.hideDialog();
                };

                scope.$on('modal.hidden', onHidden);

                return Modal.showDialog(template, scope);
            };

            return {
                showDialog : showSessionTimeoutModal,
                setTemplate : setTemplate,
                setOnHidden : setOnHidden
            };
        }
    ]);
