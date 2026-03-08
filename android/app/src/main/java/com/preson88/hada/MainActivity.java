package com.preson88.hada;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen; // 임포트 추가
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // super.onCreate 이전에 호출해야 스플래시가 정상 작동합니다.
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}