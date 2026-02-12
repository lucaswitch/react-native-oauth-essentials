#import <OauthEssentialsSpec/OauthEssentialsSpec.h>

@interface OauthEssentials : NativeOauthEssentialsSpecBase <NativeOauthEssentialsSpec>

- (void)emitOnCredentialSuccess:(NSDictionary *)value;
- (void)emitOnCredentialFailure:(NSDictionary *)value;

@end
