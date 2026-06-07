$base = "http://localhost:4000/api"
$results = @()

function Test-Api($name, $method, $path, $body = $null, $headers = $null) {
  try {
    $params = @{
      Uri = "$base$path"
      Method = $method
      ErrorAction = "Stop"
    }
    if ($body) { $params.Body = $body; $params.ContentType = "application/json" }
    if ($headers) { $params.Headers = $headers }
    $r = Invoke-RestMethod @params
    $results += [PSCustomObject]@{Name=$name; Status="✅ PASS"; Path="$method $path"; Detail=if($r -is [array]){"array[$($r.Count)]"}elseif($r -is [string]){$r.Substring(0,[Math]::Min(50,$r.Length))}else{$r | ConvertTo-Json -Depth 2 | Select-Object -First 60}}
    Write-Host "✅ $name  ->  $method $path  OK"
  } catch {
    $msg = $_.Exception.Message
    try { $resp = $_.Exception.Response; if ($resp) { $status = [int]$resp.StatusCode; $msg = "HTTP $status $msg" } } catch {}
    $results += [PSCustomObject]@{Name=$name; Status="❌ FAIL"; Path="$method $path"; Detail=$msg}
    Write-Host "❌ $name  ->  $method $path  FAIL: $msg"
  }
}

Write-Host "=== 1. 公开API ==="
Test-Api "健康检查" GET "/health"
Test-Api "课程列表" GET "/courses"
Test-Api "分类列表" GET "/categories"
Test-Api "门店列表" GET "/stores"
Test-Api "定价规则" GET "/pricing"

Write-Host "`n=== 2. 会员登录 ==="
$loginBody = @{role="member"; phone="13800000001"; password="123456"} | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$memberToken = $loginResp.token
$memberHeaders = @{Authorization="Bearer $memberToken"}
Write-Host "✅ 会员登录成功 token长度=$($memberToken.Length)"

Write-Host "`n=== 3. 会员认证API ==="
Test-Api "会员/me" GET "/auth/me" $null $memberHeaders
Test-Api "会员预约列表" GET "/bookings" $null $memberHeaders
Test-Api "会员候补列表" GET "/waiting" $null $memberHeaders
Test-Api "会员退款列表" GET "/refunds" $null $memberHeaders
Test-Api "会员消息列表" GET "/messages" $null $memberHeaders
Test-Api "会员消息未读数" GET "/messages/unread-count" $null $memberHeaders

Write-Host "`n=== 4. 预约核心流程 ==="
$bookBody = @{courseId="course5"} | ConvertTo-Json
Test-Api "创建预约-course5" POST "/bookings" $bookBody $memberHeaders
$bookBody2 = @{courseId="course2"} | ConvertTo-Json
Test-Api "预约满员课程course2(应进入候补)" POST "/bookings" $bookBody2 $memberHeaders

Write-Host "`n=== 5. 教练登录 ==="
$coachLogin = @{role="coach"; phone="13900000001"; password="123456"} | ConvertTo-Json
$coachResp = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $coachLogin -ContentType "application/json"
$coachToken = $coachResp.token
$coachHeaders = @{Authorization="Bearer $coachToken"}
Write-Host "✅ 教练登录成功"

Write-Host "`n=== 6. 教练API ==="
Test-Api "教练/me" GET "/auth/me" $null $coachHeaders
Test-Api "教练课程列表" GET "/courses" $null $coachHeaders
Test-Api "教练课程详情course7" GET "/courses/course7" $null $coachHeaders
Test-Api "教练候补队列" GET "/waiting" $null $coachHeaders
Test-Api "教练统计" GET "/stats/coach/coach1" $null $coachHeaders

Write-Host "`n=== 7. 运营经理登录 ==="
$mgrLogin = @{role="manager"; phone="13700000001"; password="123456"} | ConvertTo-Json
$mgrResp = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $mgrLogin -ContentType "application/json"
$mgrToken = $mgrResp.token
$mgrHeaders = @{Authorization="Bearer $mgrToken"}
Write-Host "✅ 运营经理登录成功"

Write-Host "`n=== 8. 运营经理API ==="
Test-Api "经理退款列表" GET "/refunds" $null $mgrHeaders
Test-Api "经理满意度排名" GET "/stats/coach-satisfaction" $null $mgrHeaders

Write-Host "`n=== 9. 店长登录 ==="
$ownerLogin = @{role="owner"; phone="13600000001"; password="123456"} | ConvertTo-Json
$ownerResp = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $ownerLogin -ContentType "application/json"
$ownerToken = $ownerResp.token
$ownerHeaders = @{Authorization="Bearer $ownerToken"}
Write-Host "✅ 店长登录成功"

Write-Host "`n=== 10. 店长API ==="
Test-Api "店长门店月度数据" GET "/stats/store-monthly" $null $ownerHeaders

Write-Host "`n`n================== 测试结果汇总 =================="
$results | Format-Table -AutoSize
$pass = ($results | Where-Object {$_.Status -like "*PASS*"}).Count
$fail = ($results | Where-Object {$_.Status -like "*FAIL*"}).Count
Write-Host "总计: $($results.Count) 个接口, 成功 $pass, 失败 $fail"
