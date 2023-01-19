angular.module('Realize.myContent.myContentCtrl', [
    'ModalServices',
    'Realize.assessment.assessmentDataService',
    'rlzComponents.components.i18n',
    'Realize.paths',
    'Realize.common.alerts',
    'Realize.content',
    'Realize.common.browserInfoService',
    'Realize.constants.fileUploadErrorResponse',
    'Realize.navigationService',
    'Realize.common.optionalFeaturesService',
    'Realize.content.createOptions',
    'Realize.content.upload',
    'Realize.constants.contentUploadTypes'
])
    .controller('MyContentCtrl', [
        '$scope',
        '$routeParams',
        'Content',
        'MyContent',
        '$log',
        '$location',
        '$currentUser',
        'MyContentData',
        'lwcI18nFilter',
        'PATH',
        'AlertService',
        'BrowserInfo',
        'NavigationService',
        'CONTENT_UPLOAD_TYPES',
        function($scope, $routeParams, Content, MyContent, $log, $location, $currentUser, MyContentData,
            lwcI18nFilter, PATH, AlertService, BrowserInfo, NavigationService, CONTENT_UPLOAD_TYPES) {

            'use strict';

            $scope.myUploads = MyContentData;
            $scope.subPage = CONTENT_UPLOAD_TYPES.CREATE_CONTENT_SUBNAV;

            /**
             * We display a 'success' message in my_content.jsp after the user has successfully uploaded
             * a file, link, or assessment.  Since those pages are in a different scope, we use the service
             * to store the success value.  Here we retrieve those values, assign to this scope, then clear.
             */
            $scope.successReply = {
                uploadFile: MyContent.getSuccessMsgFlag('file'),
                addLink: MyContent.getSuccessMsgFlag('link'),
                addTest: MyContent.getSuccessMsgFlag('assessment')
            };

            MyContent.clearSuccessMsgFlag();

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

            $scope.containerId = $routeParams.programId;

            $scope.uploadView = $location.path().split('/').pop();
            $scope.uploadView = [CONTENT_UPLOAD_TYPES.LINK, CONTENT_UPLOAD_TYPES.GOOGLE_DRIVE,
                    CONTENT_UPLOAD_TYPES.FILE].indexOf($scope.uploadView) > -1 ? $scope.uploadView : false;

            // tracking for Undo
            $scope.removedItem = {};
            $scope.undoIsOn = {};
            $scope.itemRemovedMessage = {};

            $scope.isEssayPrompt = function(item) {
                return item.essayPrompt;
            };

            $scope.showInfoLink = function(item) {
                return !(item.mediaType === 'Tier' || !item.$hasInfo() || $scope.isEssayPrompt(item));
            };

            var addedContent = function() {
                return !!(MyContent.getSuccessMsgFlag(CONTENT_UPLOAD_TYPES.FILE) ||
                            MyContent.getSuccessMsgFlag(CONTENT_UPLOAD_TYPES.LINK) ||
                            MyContent.getSuccessMsgFlag(CONTENT_UPLOAD_TYPES.GOOGLE_DRIVE) ||
                            MyContent.getSuccessMsgFlag(CONTENT_UPLOAD_TYPES.ASSESSMENT));
            };

            $scope.back = function(e) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                var path = $location.path(),
                    isAtMyContentRoot = path.split('/').reverse()[0] === 'myContent',
                    next = path.split('/myContent')[0],
                    forceFallback = true;

                if (addedContent() || !isAtMyContentRoot) {
                    //If just added content, or at myContent/[link,file,etc...] go to my content
                    next += '/myContent';
                }
                NavigationService.back(next, forceFallback);
            };

            $scope.removeItem = function(e, item) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                $scope.showUndo(item.id);
                $scope.removedItem[item.id] = true;
                $scope.removeMessage(item);
                MyContent.removeMyUploadsItem(item.id);
            };

            $scope.undoRemoveItem = function(e, itemId) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                MyContent.undoRemoveMyUploadsItem(itemId, $scope.containerId).then(function() {
                    $scope.removedItem[itemId] = false;
                    $scope.undoIsOn[itemId] = false;
                });
            };

            $scope.showUndo = function(itemId) {
                $scope.undoIsOn[itemId] = true;
            };

            $scope.removeMessage = function(item) {
                $scope.itemRemovedMessage[item.id] = $scope.isEssayPrompt(item) ?
                    lwcI18nFilter('myContent.essayPromptRemoved.message') :
                    lwcI18nFilter('myContent.itemRemoved.message');
            };

            $scope.open = function(e, item) {
                e.preventDefault();
                e.stopPropagation();

                if ($scope.removedItem[item.id]) {
                    return;
                }

                var p = $location.path(),
                    itemId;

                if (item.$isNbcItem()) {
                    p = ['/nbclearn/video', item.id, item.version].join('/');
                } else {
                    itemId = (item && item.customizedItem && item.customizedItemDefaultView) ?
                        item.customizedItem.id : item.id;
                    p = [p, 'content', itemId, item.version].join('/');
                }

                $location.path(p);
            };

            $scope.closeUploadView = function($event) {
                $event.preventDefault();
                $scope.back();
            };

            $scope.onUploadSuccess = function(type, data) {
                var newContent = new Content(data.item);
                $scope.myUploads.unshift(newContent);
                $scope.back();
            };

            $scope.onUploadFailure = function(type, error) {
                $log.error('onUploadFailure type:', type, 'error:', error);
            };
        }
    ]);
