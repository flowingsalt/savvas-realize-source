angular.module('Realize.Discussions', [
    'DiscussApp',
    'FileUpload.ChooseButton',
    'Realize.Attach.attachmentModalUtilService',
    'Realize.common.browserInfoService',
    'Realize.common.tokenInterceptor',
    'Realize.common.tokenRecovery',
    'Realize.constants.fileUploadErrorResponse',
    'Realize.Discussions.Helpers',
    'Realize.Discussions.StateManager',
    'Realize.Discussions.Token'
    ])
    .constant('DISCUSS_APP_MESSAGE_LOCATION', window.mediaPath + '/js/discuss/locale/realize_discuss')
    .constant('DISCUSS_INTEGRATION_MESSAGE_LOCATION', window.mediaPath + '/js/discuss/locale/realize_messages')
    .config([
        'DiscussRestAPIBasePathProvider',
        'CommonTokenInterceptorProvider',
        'CommonTokenRecoveryProvider',
        'DiscussLocaleProvider',
        'rlzMessagesProvider',
        'DISCUSS_APP_MESSAGE_LOCATION',
        'DISCUSS_INTEGRATION_MESSAGE_LOCATION',
        function(DiscussRestAPIBasePathProvider,
            CommonTokenInterceptorProvider,
            CommonTokenRecoveryProvider,
            DiscussLocaleProvider,
            rlzMessagesProvider,
            DISCUSS_APP_MESSAGE_LOCATION,
            DISCUSS_INTEGRATION_MESSAGE_LOCATION) {
            'use strict';

            var url = window.discussionApiUrl;

            DiscussRestAPIBasePathProvider.set(url);

            CommonTokenInterceptorProvider.registerTokenProvider('DiscussTokenSvc');
            CommonTokenRecoveryProvider.registerTokenProvider('DiscussTokenSvc');

            DiscussLocaleProvider.init(undefined, DISCUSS_APP_MESSAGE_LOCATION);
            rlzMessagesProvider.addLanguageFile(DISCUSS_INTEGRATION_MESSAGE_LOCATION);
        }
    ])
    .config(['DiscussPermissionsProvider',
        function(DiscussPermissionsProvider) {
            'use strict';

            var currentUser =  window.currentUser,
                isModerator = true;

            if (currentUser.primaryOrgRole === 'Student') {
                isModerator = false;
            }

            var perms = {
                create_discussion: isModerator,
                hide_discussion: isModerator,
                hide_comment: isModerator,
                edit_comment: true,
                remove_comment: true
            };

            DiscussPermissionsProvider.setPermissions(perms);
        }
    ])
    .config(['DiscussAttachmentOptionsProvider',
        function(DiscussAttachmentOptionsProvider) {
            'use strict';

            var attachButtonOptions = {
                attachFromComputer: true,
                attachFromGoogleDrive: true,
                attachFromOneDrive: true
            };

            DiscussAttachmentOptionsProvider.configureAttachmentButtons(attachButtonOptions);
        }
    ])
    .config([
        'DiscussModelCustomizationsProvider',
        'DiscussThumbnailCustomizationsProvider',
        function(DiscussModelCustomizationsProvider, DiscussThumbnailCustomizationsProvider) {
            'use strict';

            var tranformPostSvc = [
                'GetClassMembers',
                'ParticipantSvc',
                function(GetClassMembers, ParticipantSvc) {

                    function addMemberInfoToPost(classMembers, post) {
                        post.authorDisplayName = ParticipantSvc
                            .getAuthorDisplayName(post.author, classMembers);
                        post.displayNameForComments = ParticipantSvc
                            .getReplyDisplayName(post.author, classMembers);
                        post.customAuthorAvatarUrl = ParticipantSvc
                            .getAuthorAvatarImage(post.author, classMembers);

                        if (angular.isDefined(post.posts)) {
                            angular.forEach(post.posts, function(childPost) {
                                childPost.authorDisplayName = ParticipantSvc
                                    .getAuthorDisplayName(childPost.author, classMembers);
                                childPost.displayNameForComments = ParticipantSvc
                                    .getReplyDisplayName(childPost.author, classMembers);
                                childPost.customAuthorAvatarUrl = ParticipantSvc
                                    .getAuthorAvatarImage(childPost.author, classMembers);
                            });
                        }
                        return post;
                    }

                    return function(posts, classId) {
                        return GetClassMembers(classId)
                            .then(function(classMembers) {
                                if (!Array.isArray(posts) && typeof posts === 'object') {
                                    return addMemberInfoToPost(classMembers, posts);
                                } else if (Array.isArray(posts)) {
                                    return posts.map(addMemberInfoToPost.bind(null, classMembers));
                                }
                            });
                    };
                }
            ];

            DiscussModelCustomizationsProvider.setServiceThatTransformsPosts(tranformPostSvc);

            var thumbnailSvc = [
                'GetPostItem',
                'BrowserInfo',
                function(GetPostItem, BrowserInfo) {
                    return function(post) {
                        if (post.meta.thumbnail || post.meta.thumbnail2x) {
                            if (BrowserInfo.isHDDisplay) {
                                return post.meta.thumbnail2x ?
                                        post.meta.thumbnail2x : post.meta.thumbnail;
                            } else {
                                return post.meta.thumbnail ?
                                        post.meta.thumbnail : post.meta.thumbnail2x;
                            }
                        } else {
                            //originally discussions from pearson prompts didn't
                            //store the thumbNail and took the default
                            //this will get the customThumbnail if it exists.
                            return GetPostItem(post)
                            .then(function(item) {
                                return item.$getThumbnailUrl('', false);
                            }, function() {
                                return '';
                            });
                        }
                    };
                }
            ];

            DiscussThumbnailCustomizationsProvider.setServiceThatProvidesPostThumbnails(thumbnailSvc);
        }
    ]);
