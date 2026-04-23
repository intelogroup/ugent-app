#!/bin/bash
# Medicospira automated exam loop

ITERATIONS=${1:-10}
EMAIL="Jimkalinov@gmail.com"
PASSWORD="Jimkali90#"

echo "=== Medicospira Exam Loop ==="

# Start fresh browser and login
agent-browser open "https://www.medicospira.com/uworld1/login.php"
sleep 5
agent-browser snapshot -i
agent-browser fill @e2 "$EMAIL"
agent-browser fill @e3 "$PASSWORD"
agent-browser click @e4
sleep 6

# Skip paypal
agent-browser snapshot -i
agent-browser click @e2
sleep 6

for i in $(seq 1 $ITERATIONS); do
    echo ""
    echo "=== Iteration $i ==="
    
    # Handle paypal redirect
    URL=$(agent-browser get url)
    if [[ "$URL" == *"paypal"* ]]; then
        echo "[$i] PayPal redirect..."
        agent-browser click @e2
        sleep 5
    fi
    
    # Wait for welcome
    sleep 4
    
    # Create test via JS eval
    echo "[$i] Creating test..."
    agent-browser wait --load networkidle
    agent-browser eval --stdin <<'ENDSCRIPT'
if (document.body) {
  document.body.classList.toggle('sidebar-main');
}
document.querySelector('#v-pills-create-tab').click();
setTimeout(function() {
  var s = document.querySelector('input[name="subject[]"]');
  if (s) s.click();
  var syss = document.querySelectorAll('input[name="System[]"]');
  for (var j = 0; j < syss.length; j++) {
    if (!syss[j].disabled) { syss[j].checked = true; break; }
  }
  var n = document.querySelector('#number_qbox');
  if (n) n.value = '5';
  var b = document.querySelector('#create_test_btn');
  if (b) b.click();
}, 500);
ENDSCRIPT
    sleep 6
    
    EXAM_URL=$(agent-browser get url)
    EXAM_ID=$(echo "$EXAM_URL" | grep -o 'e_id=[0-9]*' | cut -d= -f2)
    echo "[$i] Exam: $EXAM_ID"
    
    if [ -z "$EXAM_ID" ]; then
        echo "[$i] ERROR: No exam ID"
        continue
    fi
    
    # Load exam
    agent-browser open "https://www.medicospira.com/uworld1/resum_rout.php?id=$EXAM_ID"
    sleep 5
    
    # Answer 5 questions
    echo "[$i] Questions..."
    for q in 1 2 3 4 5; do
        agent-browser snapshot -i >/dev/null 2>&1
        agent-browser click @e21 2>/dev/null || true
        agent-browser click @e11 2>/dev/null || true
        sleep 1.5
        
        # Close modal if appears
        MODAL=$(agent-browser snapshot -i | grep -c "Help Us")
        if [ "$MODAL" -gt 0 ]; then
            agent-browser press Escape 2>/dev/null || true
            sleep 1
        fi
    done
    
    # End block
    echo "[$i] End block..."
    agent-browser scroll down 2000
    sleep 1
    agent-browser eval --stdin <<'ENDSCRIPT'
var f = document.querySelector('#endform');
if (f) f.style.display = 'block';
var btns = document.querySelectorAll('button, a');
for (var j = 0; j < btns.length; j++) {
  if (btns[j].textContent.trim() === 'Yes') { btns[j].click(); break; }
}
ENDSCRIPT
    sleep 5
    
    # Go home
    FINAL_URL=$(agent-browser get url)
    if [[ "$FINAL_URL" == *"test_result"* ]]; then
        agent-browser snapshot -i
        agent-browser click @e7
        sleep 5
    fi
    
    echo "[$i] Done!"
done

echo "=== Complete ==="
agent-browser close
