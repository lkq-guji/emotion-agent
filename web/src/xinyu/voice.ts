export const voiceLines=['我在呢。慢慢说，我会认真听。','今天也很高兴见到你。来这里，歇一小会儿吧。','不用着急，我们一起慢慢来，好吗？','看，云朵在慢慢走。心事也可以轻一点。','欢迎回到小岛，我一直在这里。','你来啦，今天想和我说说什么？','先休息一会儿，什么都不用着急。','我们一起看看小岛的风景吧。','无论今天怎么样，都可以慢慢来。'];
export const characterVoiceLines=[0,1,2,4,5,6,7,8] as const;
export const voiceProfiles=[{id:'soft',label:'轻柔少女',description:'轻一点、慢一点，带着明亮的少女感。'},{id:'warm',label:'温暖轻语',description:'更舒缓的语气，陪你慢慢放松下来。'}] as const;
export type VoiceProfile=typeof voiceProfiles[number]['id'];
