<?php
    $code = $_GET['code'];
    
    // echo ('PHP_VERSION');
    // echo (PHP_VERSION);
    
    if ($code == "") {
        // header('Location: https://el-shadow.github.io/synceditor/');
        echo ('нет параметра code');
        exit;
    }
       
    // $CLIENT_ID
    // $CLIENT_SECRET
    include './secrets.php'; //  храним отдельно $CLIENT_ID и $CLIENT_SECRET
    $URL = "https://github.com/login/oauth/access_token";
    
    // POST https://github.com/login/oauth/access_token
    // client_secret, client_id, code
    $postParams = array(
        'client_id' => $CLIENT_ID,
        'client_secret' => $CLIENT_SECRET,
        'code' => $code
    );
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $URL);
    curl_setopt($ch, CURLOPT_P0ST, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_P0ST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postParams));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Accept: application/json'));
    $response = curl_exec($ch);
    if($response === false) {
        echo 'Curl error: ' . curl_error($ch);
    }
    curl_close($ch);
    
    $data = json_decode($response);
    
    // Store token
    if ($data->access_token != "") {
        //echo $data->access_token;
        
        header( 'Location: http://synceditor.loc/auth.html?token='.$data->access_token );
    }
    
    // var_dump($data);
    echo $data->error_description;
?>