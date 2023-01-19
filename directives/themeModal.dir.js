angular.module('RealizeDirectives')
    .directive('themeModal', [
        '$log',
        'Modal',
        'Messages',
        '$location',
        'Content',
        '$rootScope',
        '$window',
        function($log, Modal, Messages, $location, Content, $rootScope, $window) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var modalScope = null, clickHandler;
                    clickHandler = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        modalScope = scope.$new(true);
                        modalScope.item = scope.$eval(attrs.themeModal);
                        modalScope.mode = attrs.mode;
                        // array of all themes
                        // TODO: theme name hardcoded
                        modalScope.themes = ['forest', 'outerspace'];

                        modalScope.close = function() {
                            Modal.hideDialog();
                            modalScope.$destroy();
                        };

                        modalScope.selectTheme = function(theme) {
                            modalScope.themeName = theme;
                        };

                        var createEmail = function(studentCenterUrl) {
                            return {
                                subject: Messages.getMessage('center.themeModal.email.subject'),
                                body: Messages.getMessage('center.themeModal.email.bodyPt1') +
                                    '%20\'' + modalScope.item.$getTitle() + '\'%20' +
                                    Messages.getMessage('center.themeModal.email.bodyPt2') +
                                    '%0D%0A%0D%0A' + studentCenterUrl + '%0D%0A%0D%0A' +
                                    Messages.getMessage('center.themeModal.email.bodyPt3')
                            };
                        };

                        modalScope.submit = function(e) {
                            e.preventDefault();

                            var urlWithTheme = modalScope.studentCenterData.url + '/?themeName=' + modalScope.themeName;

                            if (modalScope.mode === 'launch') {
                                $window.open(urlWithTheme, '_blank');
                            } else {
                                var mailTo = createEmail(urlWithTheme);
                                $window.location.href = [
                                    'mailto:?subject=', mailTo.subject,
                                    '&body=', mailTo.body
                                ].join('');
                            }

                            Content.setStudentCenterData({
                                centerId: modalScope.item.id,
                                themeName: modalScope.themeName
                            });

                            modalScope.close();
                        };

                        // launch modal
                        Content.setStudentCenterData({
                            centerId: modalScope.item.id
                        }).then(function(response) {
                            modalScope.studentCenterData = response;
                            modalScope.themeName =  response.themeName;
                            Modal.showDialog('templates/directives/themeModal.dir.html', modalScope);
                        });

                        scope.$applyAsync();
                    };

                    el.on('click', clickHandler);
                }
            };

        }
    ]);
