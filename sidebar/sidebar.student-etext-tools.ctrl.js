angular.module('Realize.sidebar.StudentEtextToolsSidebarCtrl', [
    'RealizeApp',
    'ModalServices',
    'RealizeDataServices',
    'Realize.content'
])
    .controller('StudentEtextToolsSidebarCtrl', [
        '$log',
        '$scope',
        '$rootScope',
        '$location',
        '$timeout',
        '$window',
        'Modal',
        'Content',
        'Messages',
        'ContentViewer',
        function($log, $scope, $rootScope, $location, $timeout, $window, Modal, Content, Messages, ContentViewer) {
            'use strict';

            $scope.currentUser = $rootScope.currentUser;
            $scope.getMessage = Messages.getMessage;

            $scope.openTool = function(event, tool) {
                event.stopPropagation();

                if (tool.mediaType === 'Document') {
                    $scope.toolsDocViewerUrl = ContentViewer.setDocViewerUrl($scope, tool);
                    Modal.toolDialog($scope, tool);
                } else if (tool.attachments.length) {
                    var url = tool.attachments[0].file;
                    if (!/^https?:\/\//.test(url)) {
                        $window.open('http://' + url, '_blank');
                    } else if (tool.mediaType === 'Desmos') {
                        $window.open(url, 'desmos');
                    } else {
                        $window.open(url, '_blank');
                    }
                }
            };

            //from etext.js
            $scope.openEtext = function(event, item) {
                event.stopPropagation();

                $location.path(['content', item.id, item.version].join('/'));
            };
        }
    ]);
