@echo "-------------------------------------------"
@echo "���Թ���Ա�������и�����������Ҽ����������������ѡ��<�Թ���Ա��������(A)>"
@echo "-------------------------------------------"
@echo "ж��ogcserver����..."
@echo "-------------------------------------------"
@cd /d %~dp0
ogc_server_services.exe --uninstall kmgd
@echo ""
@pause