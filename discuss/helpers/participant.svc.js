angular.module('Realize.Discussions.Participants', [])
    .constant('AVATAR_PATH', window.mediaPath + '/skins/default/images/profile_icons/')
    .service('ParticipantSvc', [
        'rlzMessages',
        '$rootScope',
        'AVATAR_PATH',
        'DISCUSS_INTEGRATION_MESSAGE_LOCATION',
        'BrowserInfo',
        function(rlzMessages, $rootScope, AVATAR_PATH,
            DISCUSS_INTEGRATION_MESSAGE_LOCATION, BrowserInfo) {
            'use strict';

            var svc = this;

            svc.getAuthorDisplayName = function(author, classMembers) {
                var user = _.findWhere(classMembers, {userId: author});

                if (angular.isUndefined(user)) {
                    return '';
                }

                return user.displayName || user.lastName + ', ' + user.firstName;
            };

            svc.getReplyDisplayName = function(userId, participants) {
                var user = _.findWhere(participants, {userId: userId});

                if (angular.isUndefined(user)) {
                    return rlzMessages.getMessage(DISCUSS_INTEGRATION_MESSAGE_LOCATION +
                        '|discussion.thread.postInfo.unknownAuthor');
                }

                return user.displayName || user.firstName  + ' ' + user.lastName;
            };

            svc.getAuthorAvatarImage = function(userId, participants) {
                var user = _.findWhere(participants, {userId: userId}),
                    fileExtension = (BrowserInfo.isHDDisplay ? '@2x.png' : '.png'),
                    avatarImageName = '';

                if (angular.isUndefined(user)) {
                    avatarImageName = 'default_student';
                } else {
                    avatarImageName = user.avatar;
                }

                return AVATAR_PATH + avatarImageName + fileExtension;
            };

            return svc;
        }
    ]);
